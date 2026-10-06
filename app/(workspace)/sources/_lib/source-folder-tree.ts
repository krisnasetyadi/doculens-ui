import type { Folder } from "@/services/source-folders/type/source-folder.type";

export const MAX_FOLDER_DEPTH = 3;

export function folderBreadcrumbs(folders: Folder[], folderId: string | null): Folder[] {
  const byId = new Map(folders.map((folder) => [folder.folder_id, folder]));
  const path: Folder[] = [];
  const visited = new Set<string>();
  let currentId = folderId;

  while (currentId && !visited.has(currentId)) {
    const folder = byId.get(currentId);
    if (!folder) break;
    path.unshift(folder);
    visited.add(currentId);
    currentId = folder.parent_folder_id ?? null;
  }

  return path;
}

export function folderPath(folders: Folder[], folderId: string): string {
  return folderBreadcrumbs(folders, folderId).map((folder) => folder.name).join(" / ");
}

export function childFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((folder) => (folder.parent_folder_id ?? null) === parentId);
}

export function matchingFolderIds(folders: Folder[], query: string): Set<string> {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return new Set(folders.map((folder) => folder.folder_id));

  const visible = new Set<string>();
  for (const folder of folders) {
    if (!folder.name.toLocaleLowerCase().includes(term)) continue;
    for (const ancestor of folderBreadcrumbs(folders, folder.folder_id)) {
      visible.add(ancestor.folder_id);
    }
  }
  return visible;
}

export function canMoveFolder(folders: Folder[], folderId: string, parentId: string | null): boolean {
  const byId = new Map(folders.map((folder) => [folder.folder_id, folder]));
  if (!byId.has(folderId) || parentId === folderId) return false;

  let parentDepth = 0;
  let currentId = parentId;
  const visited = new Set([folderId]);
  while (currentId) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    const current = byId.get(currentId);
    if (!current) return false;
    parentDepth += 1;
    currentId = current.parent_folder_id ?? null;
  }

  const height = (id: string, path: Set<string>): number => {
    if (path.has(id)) return MAX_FOLDER_DEPTH + 1;
    const nextPath = new Set(path).add(id);
    return 1 + Math.max(0, ...childFolders(folders, id).map((child) => height(child.folder_id, nextPath)));
  };

  return parentDepth + height(folderId, new Set()) <= MAX_FOLDER_DEPTH;
}
