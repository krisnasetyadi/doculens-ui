"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HybridQueryApi } from "@/services/resources/hybrid-query-api";
import { AvailableModelsApi } from "@/services/resources/available-models-api";
import { SessionsApi } from "@/services/resources/sessions-api";
import { PdfCollectionApi } from "@/services/resources/pdf-collection-api";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import { PaymentApi } from "@/services/resources/payment-api";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill } from "@/services/types";
import { useToast } from "@/hooks/use-toast";
import { useSourceInventory, type SourceKey } from "@/hooks/use-source-inventory";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useEfficientModeStore } from "@/stores/efficient-mode-store";
import type {
  HybridResponse,
  HybridQueryRequest,
  AvailableModelsResponse,
  LLMProvider,
  MemoryTurn,
  PdfSourceInfo,
  SessionResponse,
  SessionQuestion,
  SessionQuestionsResponse,
  UpsertSessionRequest,
  PdfCollection,
  GapAnalysisRun,
  RateLimitStatus,
  MemberTokenUsage,
  MyMemberUsageResponse,
} from "@/services";
import {
  DEFAULT_GEMINI_MODEL,
  MEMORY_CHATS,
  PAGE_CHATS,
  QUESTION_PREVIEW_LENGTH,
  REVEAL_PAGE_CHATS,
  TOC_MIN_CHATS,
  SLASH_COMMANDS,
  deriveSessionTitle,
  filterSlashCommands,
  splitLeadingCommand,
  toSkillCommands,
  type Message,
  type PdfViewerState,
  type SlashCommand,
} from "@/components/workspace/chat-interface/chat-types";
import { markdownToPlainText, stripMarkdown } from "@/lib/editor-markdown";
import {
  canPreviewInBrowser,
  downloadAuthenticatedFile,
  fetchFileAsBlobUrl,
} from "@/components/workspace/sources-panel/sources-types";

interface UseChatThreadOptions {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  selectedPublicLinkIds?: string[];
  selectedDbConnectionIds?: string[];
  pendingQuestion?: string;
  // MS-252: skill_id paired with pendingQuestion when the Home hero input
  // (which resolves its own leading "/command" before handing off — see
  // app/(workspace)/home/page.tsx) invoked a Skill rather than a plain
  // question. Read once, same instant as pendingQuestion itself.
  pendingSkillId?: string;
  onPendingQuestionConsumed?: () => void;
  initialSessionId?: string; // load an existing session from backend
}

/** Owns every piece of state and business logic for a chat thread — session
 * persistence, running queries, slash commands, regeneration — so
 * ChatInterface itself only has to worry about layout/rendering. */
export function useChatThread({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  selectedPublicLinkIds = [],
  selectedDbConnectionIds = [],
  pendingQuestion,
  pendingSkillId,
  onPendingQuestionConsumed,
  initialSessionId,
}: UseChatThreadOptions) {
  // MS-237: `messages` holds only what's actually been fetched — the most
  // recent page on session load, plus whatever loadOlder()/revealTurn() has
  // prepended since. hasMoreOlder/nextCursor mirror GET /sessions/{id}'s own
  // has_more/next_cursor. totalUserTurns is the true count of questions —
  // i.e. of chats — in the whole session (loaded or not); ChatToc needs it
  // to divide the thread across its bars, including the stretches it hasn't
  // fetched yet.
  const [messages, _setMessages] = useState<Message[]>([]);
  // MS-388: mirrors `messages` synchronously, outside React's state
  // machinery, and hands the freshly-computed list straight back. Callers
  // that must act on it right away — saving, or capturing a baseline for a
  // request about to go out — can't wait for a re-render, and after the page
  // has been navigated away from a re-render may never come at all.
  const messagesRef = useRef<Message[]>([]);
  const setMessages = (update: Message[] | ((prev: Message[]) => Message[])): Message[] => {
    const next = typeof update === "function" ? (update as (prev: Message[]) => Message[])(messagesRef.current) : update;
    messagesRef.current = next;
    _setMessages(next);
    return next;
  };
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadOlderError, setLoadOlderError] = useState(false);
  const [totalUserTurns, setTotalUserTurns] = useState(0);
  // MS-237: the navigation index behind ChatToc's hover panel — one short
  // line per question in the whole session, fetched in a single request the
  // first time the panel is opened rather than on load, since most sessions
  // are never navigated. Independent of `messages`: the panel lists
  // questions the thread hasn't paged in yet, which is the whole point of it.
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  // Which session the index above was fetched for — so it's fetched once
  // per session, and refetched after switching to a different one.
  const questionsFetchedForRef = useRef<string | null>(null);
  // Synchronous mutex for the pagination fetch — `loadingOlder` (React state)
  // is what the UI reads, but it updates on the next render, not
  // immediately. Two calls to loadOlder()/revealTurn() landing in the same
  // tick (e.g. the IntersectionObserver firing again before a re-render)
  // would both see the same stale `false` and both start a fetch. This ref
  // is set/checked synchronously, so only one fetch is ever in flight.
  const loadingOlderRef = useRef(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(!!initialSessionId);
  const sources = useSourceInventory();
  const bumpSessionsVersion = useWorkspaceStore((s) => s.bumpSessionsVersion);
  const setActiveSessionId = useWorkspaceStore((s) => s.setActiveSessionId);
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>(
    DEFAULT_GEMINI_MODEL,
  );
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const { toast } = useToast();
  const sessionIdRef = useRef<string | undefined>(initialSessionId);
  // In-flight "create session" request — lets concurrent saveSession() calls
  // (e.g. two replies landing close together) share one create instead of
  // each racing a separate POST without session_id, which forks a duplicate
  // session row in history.
  // MS-388: keyed by the draft this create belongs to, not a single slot —
  // two drafts can need creating at the same time on one instance, and a
  // shared slot made the second piggyback on the first's session_id, saving
  // its messages into the wrong conversation.
  const sessionCreatesRef = useRef<Map<string, Promise<string | undefined>>>(new Map());
  // MS-388: temp id assigned to the sidebar's optimistic row for this
  // thread's first message (brand-new chats only) — cleared once consumed,
  // reconciled to the real session_id or dropped on create failure.
  const optimisticSessionIdRef = useRef<string | null>(null);
  const setPendingSession = useWorkspaceStore((s) => s.setPendingSession);
  const reconcilePendingSession = useWorkspaceStore((s) => s.reconcilePendingSession);
  const setDraftResolution = useWorkspaceStore((s) => s.setDraftResolution);
  // MS-388: per-chat thread cache — read via getState() at switch time
  // rather than subscribed to, so a background chat's snapshot changing
  // never re-renders the chat that's actually on screen.
  const setThread = useWorkspaceStore((s) => s.setThread);
  const patchThread = useWorkspaceStore((s) => s.patchThread);
  const rekeyThread = useWorkspaceStore((s) => s.rekeyThread);
  // MS-388: one-shot signal watched below to redirect a page that's
  // restoring a still-pending draft once it's actually settled elsewhere —
  // undefined (not resolved yet) vs. null (resolved: failed) vs. a real id.
  const draftResolution = useWorkspaceStore((s) =>
    initialSessionId ? s.draftResolutions[initialSessionId] : undefined,
  );
  const router = useRouter();
  // Guards the pendingQuestion effect against double-firing for the same
  // value (e.g. React Strict Mode's dev double-invoke), which would submit
  // the same question twice and save it as two separate sessions.
  const pendingQuestionHandledRef = useRef<string | null>(null);
  // MS-388: false once this chat view is gone. A query/save deliberately
  // keeps running after unmount (leaving /home mid-reply must still land the
  // answer), but activeSessionId is shared — "which chat am I looking at" —
  // so a dead instance writing to it would drag the sidebar's highlight back
  // onto a chat the user already left.
  const mountedRef = useRef(true);
  // MS-388: records which session this instance talks to the API as. It
  // deliberately does NOT touch activeSessionId: that one is a location
  // marker owned by navigation, and wiring it to this — which also runs from
  // save/create callbacks — is what let a reply landing for an abandoned
  // chat steal the sidebar's active row.
  const setSessionId = (id: string | undefined) => {
    sessionIdRef.current = id;
  };
  /** MS-388: which chat this instance is showing right now — a real session
   * id, or a "temp-" draft id for one the backend hasn't created yet. Every
   * async request captures it at send time and re-checks it on arrival: a
   * query deliberately keeps running across a navigation, so without an
   * identity to compare against, a late reply lands in whichever chat
   * happens to be on screen instead of its own. */
  const threadKeyOf = () => sessionIdRef.current ?? optimisticSessionIdRef.current ?? null;

  // MS-388: what initialSessionId was on the previous run of the effect
  // below. "Went back to empty" is a transition, and only a transition may
  // reset the thread — checking the refs instead misfires on /home, where
  // initialSessionId is permanently undefined and Strict Mode's dev replay
  // re-runs this effect after a draft has already been started, wiping the
  // message that was just sent.
  const prevInitialSessionIdRef = useRef<string | undefined>(initialSessionId);

  // Load existing session from backend
  useEffect(() => {
    const previousSessionId = prevInitialSessionIdRef.current;
    prevInitialSessionIdRef.current = initialSessionId;

    // MS-388: park the chat being left before anything below overwrites it,
    // so coming back restores exactly this — including a reply still being
    // generated. threadKeyOf() is read before any branch touches the refs,
    // so it still names the *outgoing* chat. Skipped when the id didn't
    // actually change (first mount, and Strict Mode's dev replay).
    const outgoingKey = threadKeyOf();
    if (outgoingKey && previousSessionId !== initialSessionId) {
      setThread(outgoingKey, {
        messages: messagesRef.current,
        hasMoreOlder,
        nextCursor,
        totalUserTurns,
        loading,
      });
    }

    if (!initialSessionId) {
      // initialSessionId went back to empty (e.g. navigated to bare /ask
      // via the "Workspace" nav item) — clear out whatever was loaded
      // before, so the view doesn't stay stuck on it. A still-pending draft
      // counts as loaded too even though it has no session id (the temp-
      // branch below deliberately clears sessionIdRef), so leaving one for a
      // blank /ask has to reset as well: otherwise its messages stayed on
      // screen, `loading` stayed true (which makes handleSubmit refuse to
      // send), and this instance kept claiming that draft.
      if (previousSessionId) {
        setMessages([]);
        setHasMoreOlder(false);
        setNextCursor(null);
        setLoadOlderError(false);
        setTotalUserTurns(0);
        setQuestions([]);
        questionsFetchedForRef.current = null;
        setLoading(false);
        // Dropping ownership here is what keeps the draft's own create from
        // yanking the sidebar back to it — the create still runs and still
        // publishes through pendingSessions/draftResolutions, so whichever
        // page is actually showing that draft picks it up.
        optimisticSessionIdRef.current = null;
        setSessionId(undefined);
      }
      // Always clear the location marker, regardless of whether this
      // instance ever set it — the page previously showing it may still be
      // alive in Next's client-side route cache.
      setActiveSessionId(null);
      return;
    }

    // MS-388: restoring a chat that hasn't reached the backend yet (opened
    // by clicking its still-pending sidebar row) — there's no session to
    // GET, so hydrate from the shared draft instead. Re-adopts ownership so
    // the draftResolution watcher below can pick up wherever it lands.
    if (initialSessionId.startsWith("temp-")) {
      const draft = useWorkspaceStore.getState().pendingSessions[initialSessionId];
      if (!draft) {
        // The draft may have resolved before this restore even started — it
        // finished in the background while a different chat was open, and
        // only then did the user click back into it. pendingSessions no
        // longer has this key, but draftResolutions still remembers what it
        // became (undefined = never existed / truly unknown).
        const resolution = useWorkspaceStore.getState().draftResolutions[initialSessionId];
        if (resolution !== undefined) {
          if (resolution) {
            router.replace(`/ask?session_id=${resolution}`);
          } else {
            toast({
              title: "Couldn't start conversation",
              description: "Try sending your message again.",
              variant: "destructive",
            });
            router.replace("/ask");
          }
          return;
        }
        toast({ title: "Could not load session", variant: "destructive" });
        setSessionLoading(false);
        return;
      }
      setLoadOlderError(false);
      setQuestions([]);
      questionsFetchedForRef.current = null;
      // A draft visited before comes back from the cache — which may already
      // hold the reply that landed while the user was elsewhere. Only a
      // first visit falls back to the bare first message.
      const cachedDraft = useWorkspaceStore.getState().threads[initialSessionId];
      if (cachedDraft) {
        setMessages(cachedDraft.messages);
        setHasMoreOlder(cachedDraft.hasMoreOlder);
        setNextCursor(cachedDraft.nextCursor);
        setTotalUserTurns(cachedDraft.totalUserTurns);
        setLoading(cachedDraft.loading);
      } else {
        setMessages([{ id: `${initialSessionId}-user`, role: "user", content: draft.firstMessage }]);
        setHasMoreOlder(false);
        setNextCursor(null);
        setTotalUserTurns(1);
        setLoading(true); // same "waiting for reply" bubble as any in-flight query
      }
      // A reused instance (soft-navigated here from a different session, not
      // a fresh mount) could still hold that session's real id — this is a
      // fresh draft, not a continuation of it.
      sessionIdRef.current = undefined;
      optimisticSessionIdRef.current = initialSessionId;
      setActiveSessionId(initialSessionId);
      setSessionLoading(false);
      return;
    }

    // MS-388: if this instance still remembers owning a draft (set in the
    // temp- branch above, on the previous run of this effect), this real-id
    // load is that draft's own resolution landing — not a fresh navigation.
    // The user's message is already on screen, so skip the full-screen
    // "Restoring conversation…" reset and let the fetch quietly swap the
    // reply in, instead of it looking like a page reload.
    const cameFromOwnDraft = optimisticSessionIdRef.current !== null;
    optimisticSessionIdRef.current = null;
    // The location marker moves the instant we arrive, not when the network
    // answers — the sidebar row lights up on click, and no late response can
    // move it afterwards.
    setSessionId(initialSessionId);
    setActiveSessionId(initialSessionId);

    // Already visited this chat — restore it as it was and skip the fetch
    // entirely, so switching chats has no reload and no "Restoring
    // conversation…" flash. Anything that landed in the background was
    // written into this same snapshot, so the cache is ahead of a fresh GET.
    const cachedThread = useWorkspaceStore.getState().threads[initialSessionId];
    if (cachedThread) {
      setMessages(cachedThread.messages);
      setHasMoreOlder(cachedThread.hasMoreOlder);
      setNextCursor(cachedThread.nextCursor);
      setTotalUserTurns(cachedThread.totalUserTurns);
      setLoading(cachedThread.loading);
      setLoadOlderError(false);
      setQuestions([]);
      questionsFetchedForRef.current = null;
      setSessionLoading(false);
      return;
    }

    if (!cameFromOwnDraft) setSessionLoading(true);
    setLoadOlderError(false);
    setQuestions([]);
    questionsFetchedForRef.current = null;
    // Only the most recent page (poin 2, 10) — a long-restored history
    // opens instantly instead of the old "fetch every message, always".
    SessionsApi.find<SessionResponse>(initialSessionId, { limit: PAGE_CHATS })
      .then((data) => {
        const restored: Message[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          modelUsed: m.model_used,
        }));
        setMessages(restored);
        setHasMoreOlder(data.has_more);
        setNextCursor(data.next_cursor);
        setTotalUserTurns(data.total_user_turns);
        setSessionId(data.session_id);
      })
      .catch(() => {
        toast({ title: "Could not load session", variant: "destructive" });
      })
      .finally(() => {
        setSessionLoading(false);
        // Clears a "waiting for reply" bubble the temp- branch may have left
        // on (kept on purpose through this fetch when cameFromOwnDraft, so
        // it doesn't blink off before the reply that was the whole point of
        // waiting actually arrives).
        setLoading(false);
      });
  }, [initialSessionId]);

  // MS-388: while restoring a still-pending draft, swap over to the real
  // session the moment its background create settles — whether that happens
  // here or in a completely different, now-unmounted page that originally
  // sent it. router.replace re-triggers the effect above with the real id.
  // A failed create instead sends the user back to a bare /ask.
  useEffect(() => {
    if (!initialSessionId?.startsWith("temp-")) return;
    if (draftResolution === undefined) return;
    if (draftResolution) {
      router.replace(`/ask?session_id=${draftResolution}`);
    } else {
      toast({
        title: "Couldn't start conversation",
        description: "Your message is still here — try sending again.",
        variant: "destructive",
      });
      router.replace("/ask");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftResolution, initialSessionId]);

  // MS-388: latest committed values of the scalar thread state, for the
  // unmount cleanup below — its closure is created at mount, so reading
  // these directly there would always snapshot an empty thread.
  const threadStateRef = useRef({ hasMoreOlder, nextCursor, totalUserTurns, loading });
  useEffect(() => {
    threadStateRef.current = { hasMoreOlder, nextCursor, totalUserTurns, loading };
  });

  // Clear the location marker once this chat view goes away, so a delete
  // elsewhere doesn't act on a stale session id, and park the thread so
  // reopening it restores what was on screen. This is the path that matters
  // for leaving /home mid-reply: that route unmounts entirely while the
  // query it started keeps running. Re-arming mountedRef here (not just at
  // declaration) covers Strict Mode's dev mount -> cleanup -> mount replay.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const key = threadKeyOf();
      if (key && messagesRef.current.length > 0) {
        setThread(key, { messages: messagesRef.current, ...threadStateRef.current });
      }
      setActiveSessionId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pdfViewer, setPdfViewer] = useState<PdfViewerState>({
    open: false,
    pdfUrl: "",
    fileName: "",
  });
  const [gapAnalysisOpen, setGapAnalysisOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [efficiencyOpen, setEfficiencyOpen] = useState(false);

  // Flat safety-net rate limit (MS-248 follow-up) — checked proactively so
  // the composer can disable itself before a blocked send round-trips to
  // the backend just to 429. Refreshed on mount, after every query
  // settles (to catch a request that just tipped the user over the cap),
  // and periodically while blocked (so it clears on its own once the
  // sliding window ages out, without the user needing to retry manually).
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const refreshRateLimit = () => {
    PaymentApi.getRateLimitStatus<RateLimitStatus>()
      .then(setRateLimit)
      .catch(() => {});
  };

  useEffect(() => {
    refreshRateLimit();
  }, []);

  useEffect(() => {
    if (!rateLimit?.blocked) return;
    const interval = setInterval(refreshRateLimit, 20_000);
    return () => clearInterval(interval);
  }, [rateLimit?.blocked]);

  // Per-member allocation (admin-assigned cap, MS-248 follow-up) — a
  // second, independent way to be blocked, distinct from the flat safety
  // net above: this one doesn't self-clear on a timer, only when the
  // admin raises the allocation, so "Request more tokens" (below) is the
  // way out rather than just waiting.
  const [myUsage, setMyUsage] = useState<MemberTokenUsage | null>(null);
  const refreshMyUsage = () => {
    PaymentApi.getMyUsage<MyMemberUsageResponse>()
      .then((res) => setMyUsage(res.usage))
      .catch(() => {});
  };

  useEffect(() => {
    refreshMyUsage();
  }, []);

  const isMemberCapped = Boolean(
    myUsage && myUsage.allocated_tokens > 0 && myUsage.remaining_tokens <= 0,
  );

  useEffect(() => {
    if (!isMemberCapped) return;
    // Slower poll than the flat rate limit's — this only changes when the
    // admin acts, not on its own, so there's no urgency to catch it fast.
    const interval = setInterval(refreshMyUsage, 30_000);
    return () => clearInterval(interval);
  }, [isMemberCapped]);

  const [requestingMoreTokens, setRequestingMoreTokens] = useState(false);
  const [tokenRequestSent, setTokenRequestSent] = useState(false);

  function requestMoreTokens() {
    setRequestingMoreTokens(true);
    PaymentApi.requestMoreTokens()
      .then(() => {
        setTokenRequestSent(true);
        toast({
          title: "Request terkirim",
          description: "Admin kamu akan lihat request ini di tab Billing.",
          variant: "success",
        });
      })
      .catch((err: unknown) => {
        toast({
          title: "Gagal mengirim request",
          description: err instanceof Error ? err.message : "Coba lagi nanti.",
          variant: "destructive",
        });
      })
      .finally(() => setRequestingMoreTokens(false));
  }

  useEffect(() => {
    // Only load the models list for the dropdown — do NOT override selectedProvider/selectedModel
    // so our DEFAULT_GEMINI_MODEL default is always preserved.
    AvailableModelsApi.get<AvailableModelsResponse>()
      .then((data) => setAvailableModels(data))
      .catch(() => {});
  }, []);

  // MS-252: this account's Skills (personal + team, same visibility rule as
  // the Settings > Skills tab), so the "/" command menu can offer them
  // alongside the fixed SLASH_COMMANDS. Seeded from the workspace store's
  // cache (same "don't go blank" pattern already used for cachedSessions/
  // cachedPdfFiles) so a reload shows the last-known list instantly instead
  // of an empty menu until this fetch resolves; still fetched fresh here on
  // every mount, writing the result back to the cache. Failing silently
  // mirrors the models fetch above — skills are enrichment for the menu,
  // not required for chat to work.
  const cachedSkills = useWorkspaceStore((s) => s.cachedSkills);
  const setCachedSkills = useWorkspaceStore((s) => s.setCachedSkills);
  const [skills, setSkills] = useState<Skill[]>(() => cachedSkills);
  useEffect(() => {
    SkillApi.list()
      .then((rows) => {
        setSkills(rows);
        setCachedSkills(rows);
      })
      .catch(() => {});
  }, []);

  // Shaped for the "/" menu (SlashCommandMenu just renders whatever
  // SlashCommand[] it's given, so no menu changes are needed).
  const skillCommands: SlashCommand[] = useMemo(() => toSkillCommands(skills), [skills]);

  /** Object URL currently held by the viewer dialog. Kept so the previous
   * one can be released when another source is opened and on unmount, since
   * an object URL lives until it is revoked or the tab goes away. */
  const viewerObjectUrlRef = useRef<string | null>(null);
  const releaseViewerObjectUrl = () => {
    if (viewerObjectUrlRef.current) {
      URL.revokeObjectURL(viewerObjectUrlRef.current);
      viewerObjectUrlRef.current = null;
    }
  };
  useEffect(() => releaseViewerObjectUrl, []);

  /** Open a cited source the way its format allows (MS-414).
   *
   * Formats the browser can't render are downloaded under their real name
   * instead of being pushed into the viewer. That dialog is a PDF viewer,
   * an iframe plus page and zoom controls, so a DOCX or CSV sent through it
   * could only ever come out as an empty frame, or as "Failed to load PDF
   * document" when the stored content type still claimed PDF.
   *
   * What does get previewed is fetched here rather than handed to the iframe
   * as a plain backend URL. An iframe navigation carries no Authorization
   * header, so that URL answered 401; the HEAD request that used to guard
   * this never even got that far, because the route is registered GET-only
   * and answered 405 for every file, PDF included. `#page=N` still jumps to
   * the cited page on an object URL, so nothing is lost by the swap. */
  const openPdfViewer = (source: PdfSourceInfo) => {
    if (!source.file_url) {
      toast({
        title: "File Tidak Dapat Dibuka",
        description: `File ${source.file_name} tidak memiliki URL yang valid.`,
        variant: "destructive",
      });
      return;
    }
    if (!canPreviewInBrowser(source.file_name)) {
      downloadAuthenticatedFile(source.file_url, source.file_name);
      return;
    }
    fetchFileAsBlobUrl(source.file_url)
      .then((objectUrl) => {
        releaseViewerObjectUrl();
        viewerObjectUrlRef.current = objectUrl;
        setPdfViewer({
          open: true,
          pdfUrl: objectUrl,
          fileName: source.file_name,
          page: source.page,
          searchText: source.search_text,
          contentPreview: source.content_preview,
        });
      })
      .catch((err: unknown) =>
        toast({
          title: "File Tidak Dapat Diakses",
          description: err instanceof Error ? err.message : "Coba lagi nanti.",
          variant: "destructive",
        }),
      );
  };

  const deriveSourceMode = () => {
    // Reads the store directly (not `sources.toggles`) so a toggle set moments
    // earlier in the same call — e.g. askSuggested's setActiveOnly — is picked
    // up immediately, instead of the stale value from this render's closure.
    const toggles = useWorkspaceStore.getState().sourceToggles;
    const enabled = [
      toggles.pdf ? "pdf" : null,
      toggles.db ? "database" : null,
      toggles.chat ? "chat" : null,
      toggles.link ? "public_link" : null,
    ].filter(Boolean) as Array<"pdf" | "database" | "chat" | "public_link">;

    if (enabled.length === 0) return "none" as const;
    if (enabled.length === 1) return enabled[0];
    return "mixed" as const;
  };

  /** MS-237 poin 1: the previous `MEMORY_CHATS` chats before `beforeIndex`
   * (defaults to the end of `messages`, i.e. "before whatever is about to be
   * asked"). A chat is one question plus the answer that came back, so the
   * cut is made at the 5th-from-last question and everything after it comes
   * along — slicing a flat 5 messages instead would routinely hand the model
   * an answer whose question got left behind. Static replies (slash
   * commands, "pick a source" nudges) are skipped — they're not real
   * conversation and would just burn tokens; identifiable by `modelUsed`
   * being unset, which also holds after a session restore since the server
   * persists that same field. */
  const buildMemory = (beforeIndex?: number): MemoryTurn[] => {
    const upTo = beforeIndex ?? messages.length;
    const eligible = messages
      .slice(0, upTo)
      .filter((m) => m.role === "user" || !!m.modelUsed);
    const questionAt = eligible.reduce<number[]>((acc, m, i) => {
      if (m.role === "user") acc.push(i);
      return acc;
    }, []);
    const start =
      questionAt.length > MEMORY_CHATS ? questionAt[questionAt.length - MEMORY_CHATS] : 0;
    return eligible.slice(start).map((m) => ({
      role: m.role,
      // Questions are stored as markdown for the bubble to render, but the
      // history block is prompt text, so send what was meant rather than how
      // it was styled. Answers are left alone: the model wrote that markdown
      // itself, long before the composer could produce any.
      content: m.role === "user" ? markdownToPlainText(m.content) : m.content,
    }));
  };

  const buildRequest = (question: string, memoryBeforeIndex?: number, skillId?: string): HybridQueryRequest => {
    // Each *_ids field is left undefined on purpose: the backend already
    // resolves "active" items per source type (same as Database/Public Link
    // activation) when no explicit ids are sent, so the active/inactive
    // toggles set in Sources are always respected without duplicating that
    // resolution logic here.
    const toggles = useWorkspaceStore.getState().sourceToggles;
    return {
      // The single point every question leaves the app through, which is why
      // the markdown comes off here rather than at each call site: the
      // backend embeds this string to pick chunks, and formatting characters
      // move that vector far enough to change what comes back.
      question: markdownToPlainText(question),
      include_pdf_results: toggles.pdf,
      // The "DB" toggle queries the user's own connected database(s) from
      // Sources > Database — not the app's internal storage.
      include_external_db: toggles.db,
      include_chat_results: toggles.chat,
      include_public_links: toggles.link,
      source_mode: deriveSourceMode(),
      llm_provider: selectedProvider,
      llm_model: selectedModel,
      session_id: sessionIdRef.current ?? null,
      memory: buildMemory(memoryBeforeIndex),
      // MS-252: skill invoked inline on this one message (e.g. typed as
      // "/weekly-report ringkas minggu ini") — see handleSubmit, which
      // parses the leading "/command" token off the question text and
      // passes its skill_id through runQuery -> here. Not persisted anywhere;
      // a later message with no leading command sends none.
      skill_id: skillId,
      // MS-247 "Efficient Mode" — read directly from the store (not a hook
      // option) so this isolated toggle doesn't need threading through
      // every buildRequest call site.
      efficient_mode: useEfficientModeStore.getState().enabled,
    };
  };

  /** MS-388: `threadKey` names the chat this save belongs to — a real
   * session id, or a "temp-" draft id for one not created yet. Callers that
   * resolve asynchronously pass the key they captured when the request went
   * out, so a reply arriving after the user moved on still saves into its
   * own conversation instead of whichever one is on screen now. */
  const saveSession = async (
    msgs: typeof messages,
    threadKey: string | null = threadKeyOf(),
  ) => {
    if (msgs.length === 0) return;
    // Keep this chat's cached snapshot in step with what we're about to
    // persist — that's what makes a reply landing for a chat the user isn't
    // looking at already be there when they come back. A no-op for the chat
    // on screen: it has no snapshot until it's parked on the way out.
    if (threadKey) patchThread(threadKey, { messages: msgs });
    const firstUser = msgs.find((m) => m.role === "user");
    // Sidebar labels are plain text, so flatten before cutting: slicing the
    // markdown first can end the title inside a marker pair and leave a
    // stray "**" behind.
    const firstQuestion = firstUser ? stripMarkdown(firstUser.content) : "";
    const title = firstQuestion
      ? firstQuestion.slice(0, 60) + (firstQuestion.length > 60 ? "…" : "")
      : "Untitled conversation";
    const now = new Date().toISOString();

    // Persist to backend DB only — no localStorage. title is added below
    // only for the create path — once a session exists, its title (whether
    // still the auto-derived one or since renamed) is left for the backend
    // to keep as-is.
    const payload: UpsertSessionRequest = {
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model_used: m.modelUsed,
        created_at: now,
      })),
      pdf_collections: selectedPdfCollections,
      chat_collections: selectedChatCollections,
    };

    // A real session already exists — save straight through. The target is
    // whatever the caller named, never re-read from the refs here: they may
    // have moved on to a different chat while this was being prepared.
    if (threadKey && !threadKey.startsWith("temp-")) {
      payload.session_id = threadKey;
      SessionsApi.store<SessionResponse>(
        payload as unknown as Record<string, unknown>,
      )
        .then(() => {})
        .catch(() => {});
      return;
    }

    // A draft (or a brand-new chat with no id at all): only let ONE create
    // request go out per draft. Later callers for that same draft piggyback
    // on it instead of racing their own, which would fork a duplicate row.
    const startedTempId = threadKey;
    const createKey = threadKey ?? "__new__";
    const inFlightCreate = sessionCreatesRef.current.get(createKey);
    if (!inFlightCreate) {
      const create = SessionsApi.store<SessionResponse>(
        { ...payload, title } as unknown as Record<string, unknown>,
      )
        .then((saved) => {
          // Only move the shared location marker if this instance still owns
          // the draft the create was for — if the user has since navigated
          // to a different chat, draftResolutions below is what lets that
          // draft's own page pick up the real id, without yanking focus.
          const stillOwnsDraft =
            startedTempId !== null && optimisticSessionIdRef.current === startedTempId;
          if (saved?.session_id) {
            if (startedTempId) {
              // Adds the real-id row and drops the temp-id one as one atomic
              // update — each draft keyed by its own id, so a second,
              // unrelated draft started meanwhile is untouched. createdAt
              // carries over from the original draft (not "now") so
              // reconciling doesn't bump it to the end of the sort order.
              const createdAt =
                useWorkspaceStore.getState().pendingSessions[startedTempId]?.createdAt ?? Date.now();
              reconcilePendingSession(startedTempId, {
                id: saved.session_id,
                // Deliberately still the temp id: this is the row's React
                // key, and holding it steady is what makes the id swap
                // seamless instead of a remount.
                clientKey: startedTempId,
                title,
                firstMessage: firstUser?.content ?? "",
                createdAt,
              });
              setDraftResolution(startedTempId, saved.session_id);
              // The cached thread follows the draft to its real id, so
              // reopening it still restores instead of re-fetching.
              rekeyThread(startedTempId, saved.session_id);
            }
            if (stillOwnsDraft) {
              optimisticSessionIdRef.current = null;
              setSessionId(saved.session_id);
              // The one place a network response may move the marker, and
              // the point of MS-388: a brand-new chat becoming real. Guarded
              // on being mounted — a create resolving for a view that's
              // already gone must not move it at all.
              if (mountedRef.current) setActiveSessionId(saved.session_id);
            }
            bumpSessionsVersion();
          }
          return saved?.session_id;
        })
        .catch(() => {
          if (startedTempId) {
            setPendingSession(startedTempId, null);
            setDraftResolution(startedTempId, null);
            if (useWorkspaceStore.getState().activeSessionId === startedTempId) {
              setActiveSessionId(null);
            }
            if (optimisticSessionIdRef.current === startedTempId) optimisticSessionIdRef.current = null;
            toast({
              title: "Couldn't start conversation",
              description: "Your message is still here — try sending again.",
              variant: "destructive",
            });
          }
          return undefined;
        })
        .finally(() => {
          sessionCreatesRef.current.delete(createKey);
        });
      sessionCreatesRef.current.set(createKey, create);
      return;
    }

    const id = await inFlightCreate;
    if (!id) return;
    SessionsApi.store<SessionResponse>(
      { ...payload, session_id: id } as unknown as Record<string, unknown>,
    )
      .then(() => {})
      .catch(() => {});
  };

  /** MS-388: `sentThreadKey` / `sentMessages` are the chat this answer was
   * asked in and the thread as it stood at that moment, both captured by
   * runQuery when the request went out. A query deliberately keeps running
   * across a navigation, so on arrival there are two cases: still the same
   * chat (append normally), or the user has moved on — in which case the
   * answer is persisted against its own conversation, rebuilt from the
   * captured baseline, and nothing on screen is touched. Reading `messages`
   * here instead would append it to whatever chat is open now and save it
   * under that chat's id. */
  const appendAssistantMessage = (
    data: HybridResponse,
    sentThreadKey: string | null,
    sentMessages: Message[],
  ) => {
    // Generated once per call, not inside an updater — React's dev Strict
    // Mode invokes state-updater functions twice to catch impurity, and a
    // fresh Date.now()-based id on each could land in different
    // milliseconds, producing two message_ids for what is logically one
    // reply, and so two real DB rows. A stable id upserts one row.
    const newId = (Date.now() + 1).toString();
    const assistant: Message = {
      id: newId,
      role: "assistant" as const,
      content: data.answer,
      modelUsed: data.model_used,
      efficiency: data.efficiency,
      sources: {
        pdf_sources: data.pdf_sources,
        pdf_sources_detailed: data.pdf_sources_detailed,
        db_results: data.db_results as any,
        chat_results: data.chat_results,
        processing_time: data.processing_time,
        search_terms: data.search_terms,
        target_tables: data.target_tables,
      },
    };

    if (threadKeyOf() !== sentThreadKey) {
      saveSession([...sentMessages, assistant], sentThreadKey);
      return;
    }

    // Saved straight off setMessages's return value, not deferred inside its
    // updater — once the page has been navigated away from, an updater isn't
    // guaranteed to run at all, which silently dropped the save.
    const next = setMessages((prev) => [...prev, assistant]);
    saveSession(next, sentThreadKey);
  };

  /** Static/deterministic assistant message — used by "/" commands so the
   * reply is always accurate (backed by real API data or a fixed list),
   * never an LLM guessing about what features exist. */
  const appendStaticAssistantMessage = (content: string) => {
    // Same fixed-id-outside-the-updater reasoning as appendAssistantMessage.
    // No thread-key capture needed: this runs synchronously off a user
    // action, so the chat on screen can't have changed underneath it.
    const newId = (Date.now() + 1).toString();
    const next = setMessages((prev) => [...prev, { id: newId, role: "assistant" as const, content }]);
    saveSession(next);
  };

  /** Appends a user-authored message and keeps totalUserTurns in lockstep —
   * every user-role message counts toward it (slash commands included,
   * matching how the server counts role='user' rows), so ChatToc's chat
   * count never drifts from what a fresh reload would report. */
  const appendUserMessage = (content: string) => {
    // MS-388: first message of a brand-new chat — light up the sidebar
    // before the create-session and LLM round-trips even start. sessionIdRef
    // itself stays untouched (it's sent to the backend as session_id; the
    // temp id must never reach an API call) — only the store's
    // activeSessionId, a UI-only signal, points at it.
    if (!sessionIdRef.current && !optimisticSessionIdRef.current) {
      const now = Date.now();
      const tempId = `temp-${now}`;
      optimisticSessionIdRef.current = tempId;
      setPendingSession(tempId, {
        id: tempId,
        clientKey: tempId,
        title: deriveSessionTitle(content),
        firstMessage: content,
        createdAt: now,
      });
      setActiveSessionId(tempId);
    }
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content }]);
    setTotalUserTurns((t) => t + 1);
  };

  /** Runs one of the fixed, zero-argument SLASH_COMMANDS (opens a dialog or
   * posts a canned reply) — never called for a user Skill, which instead
   * gets its command consumed inline as part of the message text (see
   * handleSubmit / selectSlashCommand). */
  const runSlashCommand = (command: string) => {
    appendUserMessage(command);
    setInput("");

    switch (command) {
      case "/gap-check":
        setGapAnalysisOpen(true);
        break;

      case "/usage":
        setUsageOpen(true);
        break;

      case "/efficiency":
        setEfficiencyOpen(true);
        break;

      case "/upload":
        appendStaticAssistantMessage(
          "Upload dokumen baru lewat panel **Sources** di sidebar — pilih tab PDF/Chat/Database, lalu klik **Upload File**.",
        );
        break;

      case "/collections":
        PdfCollectionApi.list<PdfCollection[]>()
          .then((data) => {
            const cols = Array.isArray(data) ? data : [];
            const body = cols.length
              ? cols
                  .map((c) => `- **${c.title || c.file_names?.[0] || c.collection_id}** — ${c.status ?? "active"}`)
                  .join("\n")
              : "Belum ada collection yang di-upload.";
            appendStaticAssistantMessage(`**Collection kamu:**\n\n${body}`);
          })
          .catch(() => appendStaticAssistantMessage("Gagal memuat daftar collection."));
        break;

      case "/history":
        GapAnalysisApi.listRuns<GapAnalysisRun[]>()
          .then((data) => {
            const runs = Array.isArray(data) ? data : [];
            const body = runs.length
              ? runs
                  .slice(0, 10)
                  .map(
                    (r) =>
                      `- **${r.framework_name}** (${r.skill_id}) — ${r.status}, ${new Date(r.created_at).toLocaleString()}`,
                  )
                  .join("\n")
              : "Belum ada riwayat gap-analysis run.";
            appendStaticAssistantMessage(`**Riwayat Gap Analysis:**\n\n${body}`);
          })
          .catch(() => appendStaticAssistantMessage("Gagal memuat riwayat run."));
        break;

      case "/help":
      default:
        appendStaticAssistantMessage(
          "**Command yang tersedia:**\n\n" +
            SLASH_COMMANDS.map((c) => `- \`${c.command}\` — ${c.description}`).join("\n"),
        );
        break;
    }
  };

  /** "/" menu selection handler (SlashCommandMenu's onSelect). A static
   * command still runs immediately (unchanged). A Skill instead just fills
   * the composer with "/command " — like Claude's own skill invocation, the
   * user keeps typing their actual message right after it on the same line,
   * and it's parsed back off in handleSubmit when they send. No separate
   * "armed" state, no indicator chip: the command sitting in the input *is*
   * the indicator. */
  const selectSlashCommand = (command: string) => {
    const skillMatch = skills.find((s) => s.slash_command === command);
    if (skillMatch) {
      setInput(`${command} `);
      return;
    }
    runSlashCommand(command);
  };

  const runQuery = (question: string, skillId?: string) => {
    // No source selected at all — answering anyway means the LLM gets an
    // empty context and either hallucinates or falls back to a misleading
    // "not found in documents" reply. Direct the user to pick a source
    // instead of pretending to search nothing. Centralized here (not just
    // in handleSubmit) so it also covers askSuggested and pendingQuestion.
    if (deriveSourceMode() === "none") {
      appendStaticAssistantMessage(
        "Pilih dulu minimal satu sumber (PDF, Database, Chat, atau Drive) di toolbar sebelum bertanya, biar jawabannya bisa saya dasarkan dari data kamu.",
      );
      return;
    }
    // Rate limit hit — don't even round-trip to the backend just to 429.
    if (rateLimit?.blocked) {
      appendStaticAssistantMessage(
        "Batas token kamu untuk saat ini sudah tercapai. Coba lagi setelah beberapa saat — ini reset otomatis, tidak perlu hubungi admin.",
      );
      return;
    }
    // Admin-assigned cap hit — doesn't self-clear, direct them to ask for more.
    if (isMemberCapped) {
      appendStaticAssistantMessage(
        "Batas penggunaan token untuk periode ini telah tercapai. Klik “Request more tokens” di bawah, atau buka /usage.",
      );
      return;
    }
    setLoading(true);
    // MS-388: captured before the request goes out — appendUserMessage has
    // already run, so the draft id (new chat) or session id (existing one)
    // is in place, and messagesRef holds the thread including the question
    // being asked. Re-reading either on arrival would bind the answer to
    // whatever chat the user has since switched to.
    const sentThreadKey = threadKeyOf();
    const sentMessages = messagesRef.current;
    HybridQueryApi.store<HybridResponse>(
      buildRequest(question, undefined, skillId) as unknown as Record<string, unknown>,
    )
      .then((data: HybridResponse) => appendAssistantMessage(data, sentThreadKey, sentMessages))
      .catch((err: unknown) =>
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Query failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        // Only the chat on screen owns the composer's spinner — a reply for
        // one the user has left must not switch off the "waiting" state of
        // the chat they're actually sitting in front of.
        if (threadKeyOf() === sentThreadKey) setLoading(false);
        // Not an `else`: leaving /home mid-reply unmounts the view, so this
        // instance still matches its own chat above while the *parked*
        // snapshot — taken while the query was in flight — is the copy the
        // user will reopen. Without this it comes back with a spinner that
        // never stops. A no-op when nothing is parked.
        if (sentThreadKey) patchThread(sentThreadKey, { loading: false });
        refreshRateLimit();
        refreshMyUsage();
      });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", variant: "success" });
  };

  const regenerateMessage = (assistantId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx <= 0) return;
    const precedingUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!precedingUser) return;

    // Same "no source selected" guard as runQuery — regenerate calls the API
    // directly, so it needs its own check instead of inheriting runQuery's.
    if (deriveSourceMode() === "none") {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Pilih dulu minimal satu sumber (PDF, Database, Chat, atau Drive) di toolbar sebelum bertanya, biar jawabannya bisa saya dasarkan dari data kamu.",
              }
            : m,
        );
        setTimeout(() => saveSession(next), 0);
        return next;
      });
      return;
    }

    if (rateLimit?.blocked) {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Batas token kamu untuk saat ini sudah tercapai. Coba lagi setelah beberapa saat — ini reset otomatis, tidak perlu hubungi admin.",
              }
            : m,
        );
        setTimeout(() => saveSession(next), 0);
        return next;
      });
      return;
    }

    if (isMemberCapped) {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Batas penggunaan token untuk periode ini telah tercapai. Klik “Request more tokens” di bawah, atau buka /usage.",
              }
            : m,
        );
        setTimeout(() => saveSession(next), 0);
        return next;
      });
      return;
    }

    setRegeneratingId(assistantId);
    // Same capture-at-send reasoning as runQuery — a regenerate is just as
    // able to outlive the navigation away from the chat that started it.
    const sentThreadKey = threadKeyOf();
    const sentMessages = messagesRef.current;
    HybridQueryApi.store<HybridResponse>(
      // Memory window ends right before precedingUser — the same messages
      // the original answer would have seen, not polluted by anything
      // asked after it.
      buildRequest(precedingUser.content, messages.indexOf(precedingUser)) as unknown as Record<string, unknown>,
    )
      .then((data: HybridResponse) => {
        const withAnswer = (list: Message[]) =>
          list.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.answer,
                  modelUsed: data.model_used,
                  efficiency: data.efficiency,
                  sources: {
                    pdf_sources: data.pdf_sources,
                    pdf_sources_detailed: data.pdf_sources_detailed,
                    db_results: data.db_results as any,
                    chat_results: data.chat_results,
                    processing_time: data.processing_time,
                    search_terms: data.search_terms,
                    target_tables: data.target_tables,
                  },
                }
              : m,
          );
        if (threadKeyOf() !== sentThreadKey) {
          saveSession(withAnswer(sentMessages), sentThreadKey);
          return;
        }
        const next = setMessages(withAnswer);
        saveSession(next, sentThreadKey);
      })
      .catch((err: unknown) =>
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Regenerate failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        if (threadKeyOf() === sentThreadKey) setRegeneratingId(null);
        refreshRateLimit();
        refreshMyUsage();
      });
  };

  useEffect(() => {
    if (!pendingQuestion?.trim()) return;
    // MS-388: re-affirm regardless of whether this pendingQuestion was
    // already submitted below. Strict Mode's dev-only mount -> cleanup ->
    // mount replay runs this effect twice on first mount, and the cleanup
    // above clears activeSessionId in between; without this, the second pass
    // is skipped by the guard right after and the temp id set by the first
    // pass' own appendUserMessage is left cleared. Cheap and idempotent, so
    // it's harmless outside that dev-only replay too.
    if (optimisticSessionIdRef.current) setActiveSessionId(optimisticSessionIdRef.current);
    if (pendingQuestionHandledRef.current === pendingQuestion) return;
    pendingQuestionHandledRef.current = pendingQuestion;
    const trimmed = pendingQuestion.trim();
    onPendingQuestionConsumed?.();
    // A "/" command selected before ChatInterface mounted (e.g. from the
    // Home hero input) arrives here as pendingQuestion — route it through
    // the same handler as a command picked from the active composer.
    if (SLASH_COMMANDS.some((c) => c.command === trimmed)) {
      runSlashCommand(trimmed);
      return;
    }
    appendUserMessage(trimmed);
    // MS-252: the Home hero input already resolved its own leading
    // "/skill-command" (see app/(workspace)/home/page.tsx) — pendingQuestion
    // here is just the message text, pendingSkillId carries the skill_id
    // that came with it, read once at the same instant as pendingQuestion.
    runQuery(trimmed, pendingSkillId);
  }, [pendingQuestion]);

  const filteredCommands = filterSlashCommands(input, skillCommands);

  const handleSubmit = () => {
    if (loading) return;
    const trimmed = input.trim();

    if (trimmed.startsWith("/")) {
      const { leadingCommand, remainder, hasSpace } = splitLeadingCommand(trimmed);

      // An exact static command, regardless of anything typed after it
      // (those take no arguments — trailing text is just ignored). Checked
      // before Skills so a reserved name always wins on a naming collision,
      // consistent with skillCommands already hiding that skill from the menu.
      const staticMatch = SLASH_COMMANDS.find((c) => c.command === leadingCommand);
      if (staticMatch) {
        runSlashCommand(staticMatch.command);
        return;
      }

      // MS-252: a Skill invoked inline, Claude-style — "/weekly-report ringkas
      // minggu ini" in one line. The leading token is the exact skill
      // command (not just a filter-prefix match, so a longer message after
      // it doesn't fall through to "unknown command" below), the rest is
      // the actual question. No message yet after the command → still
      // composing, don't submit.
      const skillMatch = skills.find((s) => s.slash_command === leadingCommand);
      if (skillMatch) {
        if (!remainder) return;
        appendUserMessage(trimmed);
        setInput("");
        runQuery(remainder, skillMatch.skill_id);
        return;
      }

      // Not an exact match yet — still narrowing the command name via the
      // dropdown (e.g. "/gap" before finishing "/gap-check"). Only takes
      // the top filtered match when nothing follows a space yet, otherwise
      // a real question that happens to start with "/" (a typo'd command,
      // a path) would get hijacked mid-sentence.
      if (filteredCommands.length > 0 && !hasSpace) {
        selectSlashCommand(filteredCommands[0].command);
        return;
      }

      // Starts with "/" but matches nothing — an attempted (mistyped)
      // command, not a real question. Answering it through the LLM pipeline
      // produces a confusing generic off-topic reply; show the command list
      // instantly instead, no backend call needed.
      appendUserMessage(trimmed);
      setInput("");
      appendStaticAssistantMessage(
        `Command \`${leadingCommand}\` tidak dikenali.\n\n**Command yang tersedia:**\n\n` +
          SLASH_COMMANDS.map((c) => `- \`${c.command}\` — ${c.description}`).join("\n"),
      );
      return;
    }

    if (!trimmed) return;
    appendUserMessage(trimmed);
    setInput("");
    runQuery(trimmed);
  };

  const askSuggested = (question: string, sourceKey?: SourceKey) => {
    if (loading) return;
    // Each suggested question implies a single source ("Summarize my PDFs" →
    // PDFs only); the general question has no sourceKey and leaves whatever
    // the user last had toggled on untouched.
    if (sourceKey) sources.setActiveOnly(sourceKey);
    appendUserMessage(question);
    runQuery(question);
  };

  const handleModelChange = (provider: LLMProvider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  const hasConversation = messages.length > 0;

  /** Fetch the whole session's question index — one small request. Marked
   * as fetched before the request goes out so a mouse crossing the rail
   * repeatedly can't queue several; the mark is released again on failure
   * so a retry (the effect below, or another hover) can pick it up. */
  const loadQuestions = () => {
    const id = sessionIdRef.current;
    if (!id || questionsFetchedForRef.current === id) return;
    questionsFetchedForRef.current = id;
    setQuestionsLoading(true);
    SessionsApi.find<SessionQuestionsResponse>(`${id}/questions`)
      .then((data) => setQuestions(data.questions ?? []))
      .catch(() => {
        questionsFetchedForRef.current = null;
      })
      .finally(() => setQuestionsLoading(false));
  };

  // Fetch as soon as the rail is going to render (same threshold ChatToc
  // uses to decide whether to show itself at all) rather than waiting for
  // the first hover — a hover-triggered fetch means the panel's first open
  // sits on a network round-trip, showing only whatever's already loaded in
  // the thread until it resolves, then visibly growing once it does. Firing
  // this early means that gap is usually already closed by the time anyone
  // actually hovers. Re-runs on every new question, but loadQuestions()
  // itself is a no-op past the first successful fetch per session.
  useEffect(() => {
    if (totalUserTurns >= TOC_MIN_CHATS) loadQuestions();
  }, [totalUserTurns]);

  /** What the navigation panel actually renders: the fetched index, with
   * every question currently loaded in the thread laid over it. The overlay
   * matters in both directions — a question asked seconds ago isn't in the
   * index yet (it may not even be persisted), and after a long scroll back
   * the thread holds text for turns the index has capped away. Turns nothing
   * knows the text of are left out rather than listed as blanks; the rail's
   * bars still reach them. */
  const questionIndex = useMemo(() => {
    const byTurn = new Map<number, { turn: number; preview: string }>();
    for (const q of questions) {
      byTurn.set(q.turn, { turn: q.turn, preview: q.preview });
    }
    const loadedQuestions = messages.filter((m) => m.role === "user");
    const firstLoadedTurn = totalUserTurns - loadedQuestions.length + 1;
    loadedQuestions.forEach((m, i) => {
      const turn = firstLoadedTurn + i;
      if (turn < 1) return;
      byTurn.set(turn, {
        turn,
        // MS-391: the rail's tooltip is a one-line plain-text label, so a
        // markdown question has to be flattened before it's cut — otherwise
        // it reads "**Compare** clause 7.2" with the markers showing. Strip
        // first, then slice, or the cut could land inside a marker pair and
        // leave a stray "**" behind.
        preview: stripMarkdown(m.content).slice(0, QUESTION_PREVIEW_LENGTH),
      });
    });
    return [...byTurn.values()].sort((a, b) => a.turn - b.turn);
  }, [questions, messages, totalUserTurns]);

  /** Fetch one older page — no state writes, just data, so both loadOlder()
   * (a scroll, always one page of PAGE_CHATS) and revealTurn() (a jump,
   * which asks for however many chats it has to cross in one request rather
   * than walking there five at a time) can share it without racing each
   * other's state updates. `chats` is clamped to the 100 the endpoint
   * allows. */
  const fetchOlderPage = (cursor: string | null, chats: number = PAGE_CHATS) =>
    SessionsApi.find<SessionResponse>(sessionIdRef.current as string, {
      limit: Math.min(100, Math.max(PAGE_CHATS, chats)),
      ...(cursor ? { before: cursor } : {}),
    }).then((data) => ({
      messages: data.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        modelUsed: m.model_used,
      })) as Message[],
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
    }));

  /** Scroll-triggered (poin 3, 4, 5): fetch the next page of older messages
   * and prepend them. Safe to call from multiple triggers (sentinel,
   * Retry button) — loadingOlderRef is the actual mutex; hasMoreOlder just
   * decides whether there's anything worth fetching. */
  const loadOlder = () => {
    if (loadingOlderRef.current || !hasMoreOlder || !sessionIdRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setLoadOlderError(false);
    fetchOlderPage(nextCursor)
      .then((page) => {
        setMessages((prev) => [...page.messages, ...prev]);
        setHasMoreOlder(page.hasMore);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        setLoadOlderError(true);
      })
      .finally(() => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      });
  };

  /** ChatToc-triggered (poin 5): `turnIndex` is 1-based, counting from
   * the very first question ever asked in this session. The currently
   * loaded window always covers the most recent `loadedUserCount` turns —
   * i.e. turns (totalUserTurns - loadedUserCount + 1) .. totalUserTurns —
   * so if the target falls before that, keep paging older until it's
   * covered, commit everything fetched in one go, then resolve and return
   * its real message id (or null if the count was stale and it doesn't
   * exist) for the caller to scroll to. Already-loaded targets resolve
   * immediately with zero fetches. */
  const revealTurn = async (turnIndex: number): Promise<string | null> => {
    if (!sessionIdRef.current) return null;
    // Shares loadingOlderRef with loadOlder() — they compete for the same
    // "one pagination fetch at a time" resource, so a ChatToc jump can't
    // race a scroll-triggered load (or another jump) into firing together.
    if (loadingOlderRef.current) return null;
    let loadedUserCount = messages.filter((m) => m.role === "user").length;
    let cursor = nextCursor;
    let more = hasMoreOlder;
    let accumulated: Message[] = [];

    if (totalUserTurns - loadedUserCount + 1 > turnIndex) {
      loadingOlderRef.current = true;
      setLoadingOlder(true);
      setLoadOlderError(false);
      try {
        while (totalUserTurns - loadedUserCount + 1 > turnIndex && more) {
          // Ask for exactly the gap that's left in one request. A bar in
          // ChatToc covers a slice of the whole conversation, so the very
          // first one always points at chat 1 — crossing there five chats
          // per request would mean dozens of round-trips on a long session.
          const page = await fetchOlderPage(
            cursor,
            totalUserTurns - loadedUserCount + 1 - turnIndex,
          );
          accumulated = [...page.messages, ...accumulated];
          loadedUserCount += page.messages.filter((m) => m.role === "user").length;
          cursor = page.nextCursor;
          more = page.hasMore;
        }
      } catch {
        toast({ title: "Gagal memuat pesan sebelumnya", variant: "destructive" });
      } finally {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
    }

    if (accumulated.length) {
      setMessages((prev) => [...accumulated, ...prev]);
      setHasMoreOlder(more);
      setNextCursor(cursor);
    }

    const combined = [...accumulated, ...messages];
    const userMsgs = combined.filter((m) => m.role === "user");
    const firstLoadedTurnNumber = totalUserTurns - loadedUserCount + 1;
    return userMsgs[turnIndex - firstLoadedTurnNumber]?.id ?? null;
  };

  /** MS-417-triggered: same idea as revealTurn, but the caller only knows
   * *which* message it wants, not how far back it is — a search result
   * carries a message id, and an id says nothing about distance. So instead
   * of computing the gap, walk older pages until the id shows up. Everything
   * fetched is committed in one go, exactly like revealTurn, so the thread
   * re-renders once rather than per page.
   *
   * Resolves to the id once it's loaded, or null if the whole history was
   * walked without finding it — a search result pointing at a message that
   * has since been deleted, say. The caller simply doesn't scroll then. */
  const revealMessage = async (messageId: string): Promise<string | null> => {
    if (!sessionIdRef.current || !messageId) return null;
    if (messages.some((m) => m.id === messageId)) return messageId;
    // Shares the same one-fetch-at-a-time mutex as loadOlder()/revealTurn().
    if (loadingOlderRef.current) return null;

    let cursor = nextCursor;
    let more = hasMoreOlder;
    let accumulated: Message[] = [];
    let found = false;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setLoadOlderError(false);
    try {
      while (!found && more) {
        const page = await fetchOlderPage(cursor, REVEAL_PAGE_CHATS);
        accumulated = [...page.messages, ...accumulated];
        found = page.messages.some((m) => m.id === messageId);
        // Stop if a page brought nothing back or left the cursor where it was.
        // The endpoint only reports another page when it also returns the
        // cursor for it, so neither should happen — but every other caller
        // asks for one page per scroll, where a stalled cursor costs a single
        // wasted fetch. This one asks in a loop, so the same stall would mean
        // refetching the same page until the tab gives up.
        const stalled = page.messages.length === 0 || page.nextCursor === cursor;
        cursor = page.nextCursor;
        more = page.hasMore;
        if (!found && stalled) break;
      }
    } catch {
      toast({ title: "Gagal memuat pesan sebelumnya", variant: "destructive" });
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }

    if (accumulated.length) {
      setMessages((prev) => [...accumulated, ...prev]);
      setHasMoreOlder(more);
      setNextCursor(cursor);
    }
    return found ? messageId : null;
  };

  return {
    // Thread state
    messages,
    hasMoreOlder,
    loadingOlder,
    loadOlderError,
    loadOlder,
    totalUserTurns,
    revealTurn,
    revealMessage,
    questionIndex,
    questionsLoading,
    loadQuestions,
    hasConversation,
    loading,
    regeneratingId,
    sessionLoading,

    // Composer state
    input,
    setInput,
    filteredCommands,
    skillCommands,
    sources,
    selectedProvider,
    selectedModel,
    availableModels,
    onModelChange: handleModelChange,

    // Dialogs
    pdfViewer,
    setPdfViewer,
    gapAnalysisOpen,
    setGapAnalysisOpen,
    usageOpen,
    setUsageOpen,
    efficiencyOpen,
    setEfficiencyOpen,
    rateLimit,
    myUsage,
    isMemberCapped,
    requestMoreTokens,
    requestingMoreTokens,
    tokenRequestSent,

    // Actions
    handleSubmit,
    askSuggested,
    runSlashCommand: selectSlashCommand,
    copyMessage,
    regenerateMessage,
    openPdfViewer,
  };
}

export type ChatThread = ReturnType<typeof useChatThread>;
