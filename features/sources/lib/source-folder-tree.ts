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

/** The folder and every folder inside it, at any depth. */
export function folderWithDescendants(folders: Folder[], folderId: string): Set<string> {
  const children = childrenByParent(folders);
  const ids = new Set<string>();
  const pending = [folderId];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return ids;
}

/** Folder id -> ids of the folders directly inside it, built once instead of a scan per lookup. */
function childrenByParent(folders: Folder[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parent_folder_id) continue;
    children.set(folder.parent_folder_id, [...(children.get(folder.parent_folder_id) ?? []), folder.folder_id]);
  }
  return children;
}

/** What picking documents by folder needs to know about a document: the folder it sits in. */
export interface FolderScopedDocument {
  collection_id: string;
  folder_id?: string | null;
}

/** The documents a folder offers: everything in it and its sub-folders, in the order of `documents`.
 * `excludeIds` (e.g. the reference a gap analysis compares against) are left out. */
export function documentsInFolder<T extends FolderScopedDocument>(
  folders: Folder[],
  documents: T[],
  folderId: string,
  excludeIds: ReadonlySet<string> = new Set(),
): T[] {
  const scope = folderWithDescendants(folders, folderId);
  return documents.filter(
    (doc) => !!doc.folder_id && scope.has(doc.folder_id) && !excludeIds.has(doc.collection_id),
  );
}

/** How many documents each folder offers, its sub-folders included, in one pass over the documents
 * and one over the folders. `excludeIds` are not counted. */
export function documentCountByFolder(
  folders: Folder[],
  documents: FolderScopedDocument[],
  excludeIds: ReadonlySet<string> = new Set(),
): Map<string, number> {
  const own = new Map<string, number>();
  for (const doc of documents) {
    if (!doc.folder_id || excludeIds.has(doc.collection_id)) continue;
    own.set(doc.folder_id, (own.get(doc.folder_id) ?? 0) + 1);
  }
  const children = childrenByParent(folders);
  const totals = new Map<string, number>();
  const total = (id: string, path: Set<string>): number => {
    const known = totals.get(id);
    if (known !== undefined) return known;
    if (path.has(id)) return 0; // a cycle in bad data counts nothing twice
    const nextPath = new Set(path).add(id);
    const sum = (own.get(id) ?? 0) + (children.get(id) ?? []).reduce((acc, child) => acc + total(child, nextPath), 0);
    totals.set(id, sum);
    return sum;
  };
  for (const folder of folders) total(folder.folder_id, new Set());
  return totals;
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
