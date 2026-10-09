import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Folder as FolderIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { childFolders, folderPath, matchingFolderIds } from "../../_lib/source-folder-tree";
import type { Folder } from "@/services/source-folders/type/source-folder.type";
import {
  DIALOG_BUTTON_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_PRIMARY_CLASS,
  DIALOG_TITLE_CLASS,
  FIELD_INPUT_CLASS,
} from "../sources-ui";

type Destination = string | null;

export function FolderDestinationDialog({
  open,
  onOpenChange,
  title,
  sourceName,
  folders,
  currentFolderId,
  validFolderIds,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sourceName: string;
  folders: Folder[];
  currentFolderId: Destination;
  validFolderIds: Set<string>;
  onMove: (folderId: Destination) => Promise<boolean | void> | boolean | void;
}) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<Destination | undefined>();
  const [saving, setSaving] = useState(false);
  const visibleIds = matchingFolderIds(folders, query);
  const searching = query.trim().length > 0;
  const rootEnabled = currentFolderId !== null;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedId(undefined);
    setExpandedIds(new Set(childFolders(folders, null).map((folder) => folder.folder_id)));
  }, [open, folders]);

  const toggleExpanded = (folderId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const renderChildren = (parentId: Destination, depth: number): React.ReactNode =>
    childFolders(folders, parentId)
      .filter((folder) => visibleIds.has(folder.folder_id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => {
        const children = childFolders(folders, folder.folder_id)
          .filter((child) => visibleIds.has(child.folder_id));
        const expanded = searching || expandedIds.has(folder.folder_id);
        const enabled = validFolderIds.has(folder.folder_id) && folder.folder_id !== currentFolderId;
        return (
          <div key={folder.folder_id}>
            <div className="flex items-center rounded-lg hover:bg-muted/50" style={{ paddingLeft: depth * 18 + 8 }}>
              {children.length > 0 ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(folder.folder_id)}
                  disabled={searching}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
                  className="flex size-8 shrink-0 items-center justify-center text-muted-foreground disabled:opacity-50"
                >
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : <span className="size-8 shrink-0" />}
              <button
                type="button"
                disabled={!enabled}
                onClick={() => setSelectedId(folder.folder_id)}
                aria-pressed={selectedId === folder.folder_id}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${selectedId === folder.folder_id ? "bg-primary/10 text-primary" : "text-foreground"} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <FolderIcon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">
                  {folder.name}
                  {searching && <span className="block truncate text-xs text-muted-foreground">{folderPath(folders, folder.folder_id)}</span>}
                </span>
                {folder.folder_id === currentFolderId && <span className="ml-auto shrink-0 text-xs text-muted-foreground">Current</span>}
              </button>
            </div>
            {expanded && renderChildren(folder.folder_id, depth + 1)}
          </div>
        );
      });

  const submit = async () => {
    if (selectedId === undefined || saving) return;
    setSaving(true);
    try {
      const result = await onMove(selectedId);
      if (result !== false) onOpenChange(false);
    } catch {
      // The caller reports the API error; keep the destination selected for retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE_CLASS}>{title}</DialogTitle>
          <DialogDescription className={`${DIALOG_DESCRIPTION_CLASS} truncate`} title={sourceName}>Choose a destination for {sourceName}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search folders" placeholder="Search folders" value={query} onChange={(event) => setQuery(event.target.value)} className={`${FIELD_INPUT_CLASS} pl-10`} />
        </div>
        <div className="max-h-72 min-h-40 overflow-y-auto rounded-lg border p-1">
          {!searching && (
            <button
              type="button"
              disabled={!rootEnabled}
              onClick={() => setSelectedId(null)}
              aria-pressed={selectedId === null}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${selectedId === null ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <FolderIcon className="size-4" /> All Files (root)
              {!rootEnabled && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </button>
          )}
          {renderChildren(null, 0)}
          {searching && visibleIds.size === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No folders found</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" className={DIALOG_BUTTON_CLASS} onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className={DIALOG_PRIMARY_CLASS} onClick={() => { void submit(); }} disabled={selectedId === undefined || saving}>
            {saving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
