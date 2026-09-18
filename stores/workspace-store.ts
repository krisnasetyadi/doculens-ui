import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {Folder, Skill } from "@/services/types";
import type { Message } from "@/components/workspace/chat-interface/chat-types";

interface PendingSession {
  id: string;
  title: string;
  firstMessage: string;
  // MS-388: the id this draft was FIRST known by, kept unchanged when `id`
  // is swapped from temp to real. The sidebar uses it as the row's React
  // key, so the swap doesn't unmount and remount the row — a remount
  // restarts its colour transition, which reads as the highlight blinking
  // on the very chat the user is sitting in.
  clientKey: string;
  // MS-388: when this draft was first started — carried through
  // reconcilePendingSession unchanged even though `id` itself changes from
  // temp to real, so the sidebar can always sort newest-first regardless of
  // Record key insertion order (which reorders on reconcile, since that's
  // effectively a delete + re-insert under a new key).
  createdAt: number;
}

/** MS-388: one chat's thread as the user last left it, or as a reply that
 * landed in the background left it. Keyed by thread key — the real
 * session_id, or a "temp-" draft id for a chat the backend hasn't created
 * yet. `loading` is that chat's own "waiting for a reply" state, so a chat
 * left mid-generation still reads as generating when it's reopened. */
interface ThreadSnapshot {
  messages: Message[];
  hasMoreOlder: boolean;
  nextCursor: string | null;
  totalUserTurns: number;
  loading: boolean;
}

interface SourceFile {
  id: string;
  name: string;
  uploadedAt: string; // ISO string
  status: "uploading" | "success" | "error";
  collectionId?: string;
  meta?: string;
  rawFileName?: string;
  title?: string;
  linkedItems?: Array<{
    name: string;
    url: string;
    itemType: "file" | "folder";
  }>;
  kind?: "pdf" | "chat";
  folderId?: string;
}

interface SourceToggles {
  pdf: boolean;
  db: boolean;
  chat: boolean;
  link: boolean;
}

interface WorkspaceState {
  selectedPdfCollections: string[];
  selectedChatCollections: string[];
  selectedPublicLinkIds: string[];
  selectedDbConnectionIds: string[];
  setPdfCollections: (ids: string[]) => void;
  setChatCollections: (ids: string[]) => void;
  setPublicLinkIds: (ids: string[]) => void;
  setDbConnectionIds: (ids: string[]) => void;

  // Which source types are included in queries — shared between the home
  // hero chips and the chat toolbar so the choice persists across both.
  sourceToggles: SourceToggles;
  setSourceToggles: (toggles: Partial<SourceToggles>) => void;

  // Persisted file lists so the Sources page does not go blank on re-navigation
  cachedPdfFiles: SourceFile[];
  cachedChatFiles: SourceFile[];
  setCachedPdfFiles: (files: SourceFile[]) => void;
  setCachedChatFiles: (files: SourceFile[]) => void;

  // Same idea for the sidebar's recent-conversations list: cached so it
  // doesn't refetch/blank on every route change, and only actually re-fetched
  // when sessionsVersion is bumped (a session was created or deleted).
  cachedSessions: { id: string; title: string }[];
  setCachedSessions: (sessions: { id: string; title: string }[]) => void;
  sessionsVersion: number;
  bumpSessionsVersion: () => void;

  // MS-388: which chat the user is looking at right now — purely a location
  // marker, and the only input to the sidebar's active row. Only navigation
  // writes it (arriving on a chat, starting one, leaving the view); nothing
  // driven by the network may touch it, or a reply landing for a chat the
  // user already left would drag the highlight back onto it.
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  // MS-388: the sidebar's optimistic Recent rows for brand-new chats not yet
  // synced to the backend — set the instant a first message is sent, before
  // create-session and the LLM reply resolve. Keyed by each draft's own
  // *current* id (a "temp-…" id while pending, swapped to the real
  // session_id once created — see reconcilePendingSession) rather than a
  // single slot, so starting a second new chat before the first resolves
  // can't clobber the first one's row. firstMessage lets a different page
  // instance (opened by clicking this row) restore what was sent so far.
  // Not persisted: a reload has no in-flight create to resume, so a
  // persisted temp row would be a phantom entry.
  pendingSessions: Record<string, PendingSession>;
  setPendingSession: (id: string, session: PendingSession | null) => void;
  // Adds the real-id entry and drops the temp-id one as a single update —
  // two separate setPendingSession calls would risk an observer (the
  // sidebar's derived list) briefly rendering neither.
  reconcilePendingSession: (tempId: string, session: PendingSession | null) => void;

  // MS-388: one-shot "this temp id became X" signals, keyed by tempId. null
  // means the create failed; a key simply absent means not resolved yet.
  // Not persisted — same reasoning as pendingSessions.
  draftResolutions: Record<string, string | null>;
  setDraftResolution: (tempId: string, realId: string | null) => void;

  // MS-388: per-chat thread cache, so switching chats restores each one
  // instantly instead of re-fetching, and a query left running in the
  // background is still there when the user comes back. Not persisted.
  threads: Record<string, ThreadSnapshot>;
  setThread: (key: string, snapshot: ThreadSnapshot) => void;
  /** Merges into an existing snapshot. Deliberately a no-op when there
   * isn't one: the chat on screen has no snapshot (its local state is the
   * truth until it's parked), and writing a partial one with defaulted
   * counts would cache a thread that looks complete but isn't — which would
   * then be restored in place of a correct fetch. */
  patchThread: (key: string, patch: Partial<ThreadSnapshot>) => void;
  /** Moves a snapshot from a draft's temp id to its real session_id, so a
   * chat started optimistically stays cached once it's been created. */
  rekeyThread: (from: string, to: string) => void;
  dropThread: (key: string) => void;

  // MS-252: same "don't go blank" idea as cachedSessions/cachedPdfFiles —
  // the "/" command menu (active chat composer and the Home hero input)
  // seeds its Skills list from this on mount instead of always starting
  // empty, so a reload doesn't flash "no skills" until the fetch resolves.
  // Both composer and hero still fetch fresh on their own mount and write
  // the result back here — this is a cache, not the source of truth.
  cachedSkills: Skill[];
  setCachedSkills: (skills: Skill[]) => void;

  // MS-274: source folders (Files tab only). Cached the same way as
  // cachedPdfFiles so the Sources page doesn't flash empty on re-navigation.
  // currentFolderId is which folder is open (null = root/"All Files"),
  // persisted so a reload keeps the user where they were.
  cachedFolders: Folder[];
  setCachedFolders: (folders: Folder[]) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedPdfCollections: [],
      selectedChatCollections: [],
      selectedPublicLinkIds: [],
      selectedDbConnectionIds: [],
      setPdfCollections: (ids) => set({ selectedPdfCollections: ids }),
      setChatCollections: (ids) => set({ selectedChatCollections: ids }),
      setPublicLinkIds: (ids) => set({ selectedPublicLinkIds: ids }),
      setDbConnectionIds: (ids) => set({ selectedDbConnectionIds: ids }),

      sourceToggles: { pdf: true, db: false, chat: false, link: false },
      setSourceToggles: (toggles) =>
        set((state) => ({ sourceToggles: { ...state.sourceToggles, ...toggles } })),

      cachedPdfFiles: [],
      cachedChatFiles: [],
      setCachedPdfFiles: (files) => set({ cachedPdfFiles: files }),
      setCachedChatFiles: (files) => set({ cachedChatFiles: files }),

      cachedSessions: [],
      setCachedSessions: (sessions) => set({ cachedSessions: sessions }),
      sessionsVersion: 0,
      bumpSessionsVersion: () => set((state) => ({ sessionsVersion: state.sessionsVersion + 1 })),

      activeSessionId: null,
      setActiveSessionId: (id) => set({ activeSessionId: id }),

      pendingSessions: {},
      setPendingSession: (id, session) =>
        set((state) => {
          const next = { ...state.pendingSessions };
          if (session) next[id] = session;
          else delete next[id];
          return { pendingSessions: next };
        }),
      reconcilePendingSession: (tempId, session) =>
        set((state) => {
          const next = { ...state.pendingSessions };
          delete next[tempId];
          if (session) next[session.id] = session;
          return { pendingSessions: next };
        }),

      draftResolutions: {},
      setDraftResolution: (tempId, realId) =>
        set((state) => ({ draftResolutions: { ...state.draftResolutions, [tempId]: realId } })),

      threads: {},
      setThread: (key, snapshot) =>
        set((state) => ({ threads: { ...state.threads, [key]: snapshot } })),
      patchThread: (key, patch) =>
        set((state) => {
          const existing = state.threads[key];
          if (!existing) return {};
          return { threads: { ...state.threads, [key]: { ...existing, ...patch } } };
        }),
      rekeyThread: (from, to) =>
        set((state) => {
          const existing = state.threads[from];
          if (!existing) return {};
          const next = { ...state.threads };
          delete next[from];
          next[to] = existing;
          return { threads: next };
        }),
      dropThread: (key) =>
        set((state) => {
          if (!(key in state.threads)) return {};
          const next = { ...state.threads };
          delete next[key];
          return { threads: next };
        }),

      cachedSkills: [],
      setCachedSkills: (skills) => set({ cachedSkills: skills }),

      cachedFolders: [],
      setCachedFolders: (folders) => set({ cachedFolders: folders }),
      currentFolderId: null,
      setCurrentFolderId: (id) => set({ currentFolderId: id }),
    }),
    {
      name: "doculens-workspace",
      partialize: (state) => ({
        cachedPdfFiles: state.cachedPdfFiles,
        cachedChatFiles: state.cachedChatFiles,
        cachedSessions: state.cachedSessions,
        cachedSkills: state.cachedSkills,
        sourceToggles: state.sourceToggles,
        cachedFolders: state.cachedFolders,
        currentFolderId: state.currentFolderId,
      }),
    }
  )
);
