import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { FolderApi } from "@/services/resources/folder-api";
import type { Folder } from "@/services";

/** Folder CRUD + which folder is currently open in the Files tab (MS-274).
 * Moving a *source* into a folder lives in use-files-tab.ts instead — this
 * hook only owns folders themselves and navigation state. */
export function useSourceFolders() {
  const { toast } = useToast();
  const { cachedFolders, setCachedFolders, currentFolderId, setCurrentFolderId } =
    useWorkspaceStore();

  const [folders, setFolders] = useState<Folder[]>(cachedFolders);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const fetchFolders = () => {
    setLoadingFolders(true);
    FolderApi.list<Folder[]>()
      .then((data) => {
        setFolders(data);
        setCachedFolders(data);
        const openFolderId = useWorkspaceStore.getState().currentFolderId;
        if (openFolderId && !data.some((folder) => folder.folder_id === openFolderId)) {
          setCurrentFolderId(null);
        }
      })
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to load folders",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingFolders(false));
  };

  useEffect(() => {
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createFolder = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return Promise.resolve();
    return FolderApi.create<Folder>({ name: trimmed, parent_folder_id: currentFolderId })
      .then((folder) => {
        setFolders((prev) => {
          const next = [folder, ...prev];
          setCachedFolders(next);
          return next;
        });
        toast({ title: "Folder created", variant: "success" });
      })
      .catch((error) => {
        toast({ title: "Failed to create folder", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        throw error;
      });
  };

  const renameFolder = (folder: Folder, name: string, parentFolderId?: string | null) => {
    const trimmed = name.trim();
    if (!trimmed || (trimmed === folder.name && parentFolderId === undefined)) return Promise.resolve();
    return FolderApi.rename<Folder>(folder.folder_id, {
      name: trimmed,
      ...(parentFolderId === undefined ? {} : { parent_folder_id: parentFolderId }),
    })
      .then((updated) => {
        setFolders((prev) => {
          const next = prev.map((f) => (f.folder_id === updated.folder_id ? updated : f));
          setCachedFolders(next);
          return next;
        });
      })
      .catch((error) => {
        toast({ title: "Failed to update folder", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        throw error;
      });
  };

  const deleteFolder = (folder: Folder) => {
    return FolderApi.delete<{ deleted: boolean }>(folder.folder_id)
      .then(() => {
        setFolders((prev) => {
          const next = prev
            .filter((f) => f.folder_id !== folder.folder_id)
            .map((f) => f.parent_folder_id === folder.folder_id
              ? { ...f, parent_folder_id: folder.parent_folder_id ?? null }
              : f);
          setCachedFolders(next);
          return next;
        });
        if (currentFolderId === folder.folder_id) setCurrentFolderId(folder.parent_folder_id ?? null);
        toast({
          title: "Folder deleted",
          description: "Its files and subfolders moved up one level.",
          variant: "success",
        });
        return true;
      })
      .catch(() => {
        toast({ title: "Failed to delete folder", variant: "destructive" });
        return false;
      });
  };

  return {
    folders,
    loadingFolders,
    fetchFolders,
    currentFolderId,
    setCurrentFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
  };
}
