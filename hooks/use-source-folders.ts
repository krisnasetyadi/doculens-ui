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
    return FolderApi.create<Folder>({ name: trimmed })
      .then((folder) => {
        setFolders((prev) => {
          const next = [folder, ...prev];
          setCachedFolders(next);
          return next;
        });
        toast({ title: "Folder created", variant: "success" });
      })
      .catch(() => {
        toast({ title: "Failed to create folder", variant: "destructive" });
      });
  };

  const renameFolder = (folder: Folder, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folder.name) return Promise.resolve();
    return FolderApi.rename<Folder>(folder.folder_id, { name: trimmed })
      .then((updated) => {
        setFolders((prev) => {
          const next = prev.map((f) => (f.folder_id === updated.folder_id ? updated : f));
          setCachedFolders(next);
          return next;
        });
      })
      .catch(() => {
        toast({ title: "Failed to rename folder", variant: "destructive" });
      });
  };

  const deleteFolder = (folder: Folder) => {
    return FolderApi.delete<{ deleted: boolean }>(folder.folder_id)
      .then(() => {
        setFolders((prev) => {
          const next = prev.filter((f) => f.folder_id !== folder.folder_id);
          setCachedFolders(next);
          return next;
        });
        if (currentFolderId === folder.folder_id) setCurrentFolderId(null);
        toast({
          title: "Folder deleted",
          description: "Its files were moved back to the root — nothing was removed.",
          variant: "success",
        });
      })
      .catch(() => {
        toast({ title: "Failed to delete folder", variant: "destructive" });
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
