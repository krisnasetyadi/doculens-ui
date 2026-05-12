import { create } from "zustand";

interface WorkspaceState {
  selectedPdfCollections: string[];
  selectedChatCollections: string[];
  setPdfCollections: (ids: string[]) => void;
  setChatCollections: (ids: string[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedPdfCollections: [],
  selectedChatCollections: [],
  setPdfCollections: (ids) => set({ selectedPdfCollections: ids }),
  setChatCollections: (ids) => set({ selectedChatCollections: ids }),
}));
