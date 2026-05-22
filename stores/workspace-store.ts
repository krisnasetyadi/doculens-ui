import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SourceFile {
  id: string;
  name: string;
  uploadedAt: string; // ISO string — serialisable
  status: "uploading" | "success" | "error";
  collectionId?: string;
  meta?: string;
}

// ── Chat History ─────────────────────────────────────────────────────────────

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  createdAt: string; // ISO
}

export interface ChatSession {
  id: string;          // uuid
  title: string;       // derived from first user message
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  messages: StoredMessage[];
  pdfCollections?: string[];
  chatCollections?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────

interface WorkspaceState {
  selectedPdfCollections: string[];
  selectedChatCollections: string[];
  setPdfCollections: (ids: string[]) => void;
  setChatCollections: (ids: string[]) => void;

  // Persisted file lists so the Sources page doesn't go blank on re-navigation
  cachedPdfFiles: SourceFile[];
  cachedChatFiles: SourceFile[];
  setCachedPdfFiles: (files: SourceFile[]) => void;
  setCachedChatFiles: (files: SourceFile[]) => void;

  // Chat history
  sessions: ChatSession[];
  upsertSession: (session: ChatSession) => void;
  deleteSession: (id: string) => void;
  clearAllSessions: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedPdfCollections: [],
      selectedChatCollections: [],
      setPdfCollections: (ids) => set({ selectedPdfCollections: ids }),
      setChatCollections: (ids) => set({ selectedChatCollections: ids }),

      cachedPdfFiles: [],
      cachedChatFiles: [],
      setCachedPdfFiles: (files) => set({ cachedPdfFiles: files }),
      setCachedChatFiles: (files) => set({ cachedChatFiles: files }),

      sessions: [],
      upsertSession: (session) =>
        set((state) => {
          const exists = state.sessions.findIndex((s) => s.id === session.id);
          if (exists >= 0) {
            const updated = [...state.sessions];
            updated[exists] = session;
            return { sessions: updated };
          }
          return { sessions: [session, ...state.sessions] };
        }),
      deleteSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),
      clearAllSessions: () => set({ sessions: [] }),
    }),
    {
      name: "doculens-workspace",
      // Only persist sessions and cached files — not ephemeral selection state
      partialize: (state) => ({
        sessions: state.sessions,
        cachedPdfFiles: state.cachedPdfFiles,
        cachedChatFiles: state.cachedChatFiles,
      }),
    },
  ),
);
