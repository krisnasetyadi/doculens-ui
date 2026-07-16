import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  // Persisted file lists so the Sources page does not go blank on re-navigation
  cachedPdfFiles: SourceFile[];
  cachedChatFiles: SourceFile[];
  setCachedPdfFiles: (files: SourceFile[]) => void;
  setCachedChatFiles: (files: SourceFile[]) => void;
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

      cachedPdfFiles: [],
      cachedChatFiles: [],
      setCachedPdfFiles: (files) => set({ cachedPdfFiles: files }),
      setCachedChatFiles: (files) => set({ cachedChatFiles: files }),
    }),
    {
      name: "doculens-workspace",
      partialize: (state) => ({
        cachedPdfFiles: state.cachedPdfFiles,
        cachedChatFiles: state.cachedChatFiles,
      }),
    }
  )
);
