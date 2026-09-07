import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Skill } from "@/services/types";

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

  // Session currently open in the /ask chat view. Not persisted — cleared
  // when the chat unmounts. Read-only signal for the sidebar; doesn't touch
  // routing, so setting it never triggers a navigation/reload.
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;

  // MS-252: same "don't go blank" idea as cachedSessions/cachedPdfFiles —
  // the "/" command menu (active chat composer and the Home hero input)
  // seeds its Skills list from this on mount instead of always starting
  // empty, so a reload doesn't flash "no skills" until the fetch resolves.
  // Both composer and hero still fetch fresh on their own mount and write
  // the result back here — this is a cache, not the source of truth.
  cachedSkills: Skill[];
  setCachedSkills: (skills: Skill[]) => void;
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

      cachedSkills: [],
      setCachedSkills: (skills) => set({ cachedSkills: skills }),
    }),
    {
      name: "doculens-workspace",
      partialize: (state) => ({
        cachedPdfFiles: state.cachedPdfFiles,
        cachedChatFiles: state.cachedChatFiles,
        cachedSessions: state.cachedSessions,
        cachedSkills: state.cachedSkills,
        sourceToggles: state.sourceToggles,
      }),
    }
  )
);
