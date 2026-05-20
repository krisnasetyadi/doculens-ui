import { create } from "zustand";

interface SourceFile {
  id: string;
  name: string;
  uploadedAt: string; // ISO string — serialisable
  status: "uploading" | "success" | "error";
  collectionId?: string;
  meta?: string;
}

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
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedPdfCollections: [],
  selectedChatCollections: [],
  setPdfCollections: (ids) => set({ selectedPdfCollections: ids }),
  setChatCollections: (ids) => set({ selectedChatCollections: ids }),

  cachedPdfFiles: [],
  cachedChatFiles: [],
  setCachedPdfFiles: (files) => set({ cachedPdfFiles: files }),
  setCachedChatFiles: (files) => set({ cachedChatFiles: files }),
}));
