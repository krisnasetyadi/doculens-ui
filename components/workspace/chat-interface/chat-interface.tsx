"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { GapAnalysisDialog } from "@/components/gap-analysis-dialog";
import { useChatThread } from "@/hooks/use-chat-thread";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatMessage } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { ChatToc } from "./chat-toc";

// Top sentinel starts loading the next page this far before it's actually
// visible — an early trigger means older messages are usually already in
// by the time the user scrolls into the loading zone, instead of them
// hitting a dead stop and having to wait.
const TOP_SENTINEL_ROOT_MARGIN = "200px 0px 0px 0px";

// The composer's top edge is a transparent-to-opaque gradient (its `pt-12`).
// Text resting in that band is still legible, so the thread doesn't reserve
// the whole band — trimming it keeps the resting gap from looking empty.
const COMPOSER_FADE_ALLOWANCE = 40;

// How close to the true bottom counts as "at the bottom" for the ChatToc
// rail's active-chat snap — a few px of slack for sub-pixel scroll
// rounding, not a real reading threshold.
const BOTTOM_SNAP_PX = 4;

interface ChatInterfaceProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  selectedPublicLinkIds?: string[];
  selectedDbConnectionIds?: string[];
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
  initialSessionId?: string; // load an existing session from backend
}

export function ChatInterface(props: ChatInterfaceProps) {
  const thread = useChatThread(props);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The composer floats over the thread, so the thread reserves room for it.
  // Its height isn't fixed — the toolbar chips wrap on narrow widths, zoom, or
  // larger font sizes — so measure it instead of hardcoding the gap, otherwise
  // the last lines end up stuck behind it.
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  // MS-237 pagination/navigation: the scrollable thread itself, an
  // invisible sentinel pinned above the oldest loaded message (observed to
  // trigger loading more), and a message id pending a scroll-into-view once
  // revealTurn() resolves it.
  const threadRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollRef = useRef<{ height: number; top: number } | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  // Auto-scroll to the newest message. Keyed on the LAST message's id, not
  // the whole `thread.messages` array/reference — loadOlder()/revealTurn()
  // prepend older messages onto that same array, and prepending never
  // changes what the last message is, so this correctly stays put instead
  // of yanking the user back to the bottom every time they scroll up (or
  // jump via ChatToc) for older history.
  const lastMessageId = thread.messages[thread.messages.length - 1]?.id;
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastMessageId, thread.loading]);

  // Session just finished (re)loading -> jump straight to the bottom
  // synchronously, before paint. Without this, the thread briefly sits at
  // scrollTop 0 while the smooth scroll above is still animating there, and
  // in that window the top sentinel (also just mounted, right at the top of
  // the thread) gets reported as "intersecting" by its IntersectionObserver
  // -> an eager loadOlder() fires, prepends another page, and the scroll-
  // anchoring effect below leaves the view sitting at the boundary between
  // the two pages instead of the bottom. Layout effects run before passive
  // effects (the sentinel's observer included), so this wins the race.
  // Whether the snap above still needs a follow-up once composerHeight
  // settles (see next effect) — only for the load that just happened, not
  // every future composerHeight change (e.g. the composer growing while the
  // user is scrolled up reading old messages shouldn't yank them back down).
  const pendingBottomSnapRef = useRef(false);
  useLayoutEffect(() => {
    if (thread.sessionLoading) return;
    pendingBottomSnapRef.current = true;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.sessionLoading]);

  // composerHeight starts at 0 and is only measured after the composer
  // actually mounts (ResizeObserver's first callback lands a frame after
  // the snap above), so the container's real bottom padding isn't applied
  // yet when that snap runs — it lands short of the true bottom by however
  // much padding the composer ends up reserving. Re-snap once that height
  // resolves, so the initial landing accounts for the real padding too.
  useLayoutEffect(() => {
    if (!pendingBottomSnapRef.current) return;
    pendingBottomSnapRef.current = false;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [composerHeight]);

  // Capture the scroll anchor, then run a pagination fetch — shared by the
  // sentinel observer below and the inline Retry action, so both preserve
  // reading position the same way.
  const handleLoadOlder = () => {
    const el = threadRef.current;
    if (el) prevScrollRef.current = { height: el.scrollHeight, top: el.scrollTop };
    thread.loadOlder();
  };

  // Top sentinel enters the viewport -> pull in the next page of history.
  // IntersectionObserver instead of a scroll listener: no per-pixel scroll
  // handler running on every frame, and the root/rootMargin/threshold model
  // maps directly onto "start loading a bit before the user hits the top"
  // without manually computing distances. Paused while a load is already
  // in flight or already failed (loadOlderError) — the failed case waits
  // for the user's explicit Retry instead of silently hammering the same
  // request every time the sentinel re-intersects.
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = threadRef.current;
    if (!sentinel || !root || !thread.hasMoreOlder) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !thread.loadingOlder && !thread.loadOlderError) {
          handleLoadOlder();
        }
      },
      { root, rootMargin: TOP_SENTINEL_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [thread.hasMoreOlder, thread.loadingOlder, thread.loadOlderError, thread.loadOlder]);

  // Older messages just got prepended above the current view (loadOlder,
  // via the sentinel or Retry, or revealTurn resolved) — hold the reading
  // position steady instead of letting the new content push it down. Scroll
  // anchoring: capture scrollHeight before the prepend (handleLoadOlder,
  // above), then once the DOM has the new content, add the height delta to
  // scrollTop so the same messages stay under the viewport. No-ops for a
  // normal new-message append or a revealTurn jump, since prevScrollRef is
  // only ever set right before calling loadOlder() via handleLoadOlder.
  useLayoutEffect(() => {
    const el = threadRef.current;
    const prev = prevScrollRef.current;
    if (el && prev) {
      el.scrollTop = prev.top + (el.scrollHeight - prev.height);
      prevScrollRef.current = null;
    }
  }, [thread.messages]);

  // A ChatToc click resolved to a message that may have needed paging in
  // first (revealTurn's chain-fetch) — wait for it to actually exist in the
  // DOM (this re-runs once thread.messages updates from that fetch) before
  // scrolling to it. No highlight ring on arrival — it read as a form
  // "selected" state rather than a navigation cue.
  useEffect(() => {
    if (!scrollTargetId) return;
    const node = document.getElementById(`msg-${scrollTargetId}`);
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
    setScrollTargetId(null);
  }, [scrollTargetId, thread.messages]);

  // Which chat the reader is currently on, so the rail can mark it at rest
  // instead of only reacting to hover. Read off scroll position rather than
  // an IntersectionObserver per message: a "reading line" a third down the
  // thread gives one unambiguous answer at any scroll offset, where
  // intersection ratios go ambiguous whenever several short messages are on
  // screen at once. Recomputed on a rAF so a fast scroll costs one pass per
  // frame, not one per scroll event.
  const [activeTurn, setActiveTurn] = useState<number | null>(null);
  const loadedQuestionIds = thread.messages
    .filter((m) => m.role === "user")
    .map((m) => m.id)
    .join(",");
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const ids = loadedQuestionIds ? loadedQuestionIds.split(",") : [];
    if (ids.length === 0) {
      setActiveTurn(null);
      return;
    }
    // The loaded window is always the tail of the conversation, so the first
    // loaded question's absolute turn number is what's left over.
    const firstLoadedTurn = thread.totalUserTurns - ids.length + 1;
    let frame = 0;
    const measure = () => {
      frame = 0;
      // Scrolled (at least near) all the way down -> the reader is on the
      // newest chat, full stop. Skip the reading-line heuristic below for
      // this case: the last message's own top can still sit below the 1/3
      // line at max scroll (a long final answer, or the bottom padding the
      // thread reserves for the floating composer), which would otherwise
      // leave the rail lit one chat short of the very bottom.
      if (el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SNAP_PX) {
        setActiveTurn(thread.totalUserTurns);
        return;
      }
      const bounds = el.getBoundingClientRect();
      const readingLine = bounds.top + bounds.height / 3;
      // Walk back from the newest: the first question that starts above the
      // line is the one being read. Nothing above it means the reader is
      // still up in the oldest loaded chat.
      let turn = firstLoadedTurn;
      for (let i = ids.length - 1; i >= 0; i--) {
        const node = document.getElementById(`msg-${ids[i]}`);
        if (node && node.getBoundingClientRect().top <= readingLine) {
          turn = firstLoadedTurn + i;
          break;
        }
      }
      setActiveTurn(turn);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [loadedQuestionIds, thread.totalUserTurns]);

  const handleJumpTurn = (turnIndex: number) => {
    thread.revealTurn(turnIndex).then((id) => {
      if (id) setScrollTargetId(id);
    });
  };

  // Re-runs on sessionLoading because the composer isn't mounted during the
  // restore state, so there'd be nothing to observe on the first pass.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setComposerHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [thread.sessionLoading]);

  // Session restore loading state
  if (thread.sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-['Inter']">Restoring conversation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Center scroll area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div ref={threadRef} className="flex-1 overflow-y-auto custom-scrollbar">
          <div
            className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 w-full flex flex-col space-y-8 pb-48"
            style={{
              paddingBottom: composerHeight
                ? composerHeight - COMPOSER_FADE_ALLOWANCE
                : undefined,
            }}
          >
            {/* Older-messages loading lives at the very top of the timeline,
                not as a standing instruction — it's silent until there's
                actually something happening. Nothing renders once
                hasMoreOlder is false — there's no more to page in, so no
                "beginning of conversation" marker is needed either. */}
            {thread.hasConversation && thread.hasMoreOlder && (
                <div>
                  {/* Invisible trigger, not a visual element — idle (not
                      loading, no error) this renders nothing but a 1px
                      strip, so the gap above the first message is just the
                      normal space-y rhythm between any two messages, not
                      extra padding. Needs a real (non-zero) height: a
                      zero-area target isn't reliably reported as
                      intersecting by IntersectionObserver across browsers. */}
                  <div ref={topSentinelRef} className="h-px" aria-hidden />
                  {thread.loadingOlder && (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="text-xs font-['Inter']">Loading earlier messages…</span>
                    </div>
                  )}
                  {thread.loadOlderError && !thread.loadingOlder && (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <span className="text-xs font-['Inter']">Couldn't load earlier messages</span>
                      <button
                        type="button"
                        onClick={handleLoadOlder}
                        className="text-xs font-['Inter'] font-semibold text-primary hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
            )}

            {!thread.hasConversation ? (
              <ChatEmptyState onAskSuggested={thread.askSuggested} />
            ) : (
              thread.messages.map((message) => (
                <div key={message.id} id={`msg-${message.id}`}>
                  <ChatMessage
                    message={message}
                    isRegenerating={thread.regeneratingId === message.id}
                    onCopy={thread.copyMessage}
                    onRegenerate={thread.regenerateMessage}
                    onOpenPdfViewer={thread.openPdfViewer}
                  />
                </div>
              ))
            )}

            {thread.loading && (
              <div className="flex items-start space-x-4">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-primary/15">
                    <span className="material-symbols-outlined text-primary text-sm">hub</span>
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card rounded-2xl px-5 py-3.5 border border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-['Inter'] text-muted-foreground">Synthesizing intelligence…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {thread.hasConversation && (
          // The rail sits in the middle band of the thread, not stretched
          // top-to-bottom — three flex rows split 0.8 / 2 / 0.8 so the band
          // it's centered in is a fixed ~56% of the available height with
          // matching blank space above and below, at any window size,
          // rather than the rail's own (much shorter) content just being
          // centered inside the full height and leaving lopsided margins.
          <div
            // No explicit height: `top` (via className) and `bottom` (via
            // style) alone stretch an absolutely positioned box to fill the
            // gap between them — an explicit height here would fight that
            // instead of matching it.
            className="absolute right-2 top-3 z-20 flex flex-col items-end"
            style={{ bottom: (composerHeight || 56) + 8 }}
          >
            <div style={{ flex: "0.8 0 0%" }} />
            <div className="flex min-h-0 flex-1 basis-0" style={{ flexGrow: 2 }}>
              <ChatToc
                totalUserTurns={thread.totalUserTurns}
                questionIndex={thread.questionIndex}
                questionsLoading={thread.questionsLoading}
                loadingOlder={thread.loadingOlder}
                activeTurn={activeTurn}
                onOpen={thread.loadQuestions}
                onJumpTurn={handleJumpTurn}
              />
            </div>
            <div style={{ flex: "0.8 0 0%" }} />
          </div>
        )}

        <ChatComposer
          ref={composerRef}
          sources={thread.sources}
          input={thread.input}
          onInputChange={thread.setInput}
          onSubmit={thread.handleSubmit}
          loading={thread.loading}
          filteredCommands={thread.filteredCommands}
          onRunSlashCommand={thread.runSlashCommand}
          selectedProvider={thread.selectedProvider}
          selectedModel={thread.selectedModel}
          onModelChange={thread.onModelChange}
          availableModels={thread.availableModels}
          onGapCheckClick={() => thread.setGapAnalysisOpen(true)}
        />
      </div>

      <PdfViewerDialog
        open={thread.pdfViewer.open}
        onOpenChange={(open) => thread.setPdfViewer((prev) => ({ ...prev, open }))}
        pdfUrl={thread.pdfViewer.pdfUrl}
        fileName={thread.pdfViewer.fileName}
        initialPage={thread.pdfViewer.page}
        searchText={thread.pdfViewer.searchText}
        contentPreview={thread.pdfViewer.contentPreview}
      />

      <GapAnalysisDialog open={thread.gapAnalysisOpen} onOpenChange={thread.setGapAnalysisOpen} />
    </div>
  );
}
