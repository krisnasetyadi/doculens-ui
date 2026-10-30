"use client";

import { useMemo, useState, type ReactNode, type Ref } from "react";
import { ChevronDown, ChevronRight, FileText, Folder as FolderIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IconButton } from "@/components/icon-button";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { cn } from "@/lib/utils";
import type { Folder } from "@/services/source-folders/type/source-folder.type";
import {
  childFolders,
  documentCountByFolder,
  folderWithDescendants,
  type FolderScopedDocument,
} from "../lib/source-folder-tree";

export interface FolderScopeDocument extends FolderScopedDocument {
  label: string;
}

interface FolderScopeTreeProps {
  folders: Folder[];
  documents: FolderScopeDocument[];
  /** The one folder documents are picked from ("" for none yet). */
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  /** Documents ticked inside the selected folder and its sub-folders. */
  selectedDocumentIds: string[];
  onToggleDocument: (collectionId: string) => void;
  /** A document that can never be picked (e.g. the gap analysis reference), marked in its folder. */
  excludedId?: string;
  excludedLabel?: string;
  /** Spread onto the first folder that can be chosen, so a form's id, error state and focus reach the tree. */
  firstControlProps?: { id?: string; ref?: Ref<HTMLButtonElement>; "aria-invalid"?: boolean };
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

// Each level steps in by the width of the expand button, so a row's radio sits under its parent's.
const INDENT_PX = 18;
// A document row starts under its folder's name: past the expand button, the radio and the gaps.
const DOCUMENT_OFFSET_PX = 46;

const byName = (a: Folder, b: Folder) => a.name.localeCompare(b.name);

/**
 * Pick one folder of documents, then the documents in it (MS-849). Clicking a folder opens it to
 * show its sub-folders and the documents directly inside. Choosing a folder opens it and everything
 * below it, and its documents (sub-folders included) get checkboxes; the documents of other folders
 * are only listed. A folder with nothing to pick cannot be chosen.
 */
export function FolderScopeTree({
  folders,
  documents,
  selectedFolderId,
  onSelectFolder,
  selectedDocumentIds,
  onToggleDocument,
  excludedId,
  excludedLabel = "Excluded",
  firstControlProps,
  className,
  ...aria
}: FolderScopeTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Counting walks every folder and document, so it only reruns when those or the excluded one change,
  // not on every tick.
  const counts = useMemo(
    () => documentCountByFolder(folders, documents, new Set(excludedId ? [excludedId] : [])),
    [folders, documents, excludedId],
  );
  const scope = useMemo(
    () => (selectedFolderId ? folderWithDescendants(folders, selectedFolderId) : new Set<string>()),
    [folders, selectedFolderId],
  );
  const documentsByFolder = useMemo(() => {
    const byFolder = new Map<string, FolderScopeDocument[]>();
    for (const doc of documents) {
      if (doc.folder_id) byFolder.set(doc.folder_id, [...(byFolder.get(doc.folder_id) ?? []), doc]);
    }
    return byFolder;
  }, [documents]);
  const ticked = new Set(selectedDocumentIds);
  const roots = childFolders(folders, null).sort(byName);
  // A disabled radio cannot take focus, so a failed submit's focus goes to the first one that can.
  const focusTargetId = roots.find((folder) => (counts.get(folder.folder_id) ?? 0) > 0)?.folder_id;

  const toggleExpanded = (folderId: string) =>
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });

  const selectFolder = (folderId: string) => {
    // The documents now carry checkboxes, so show them all, down to the deepest sub-folder.
    setExpandedIds((previous) => new Set([...previous, ...folderWithDescendants(folders, folderId)]));
    onSelectFolder(folderId);
  };

  const renderDocument = (doc: FolderScopeDocument, depth: number) => {
    const isExcluded = doc.collection_id === excludedId;
    const pickable = !isExcluded && !!doc.folder_id && scope.has(doc.folder_id);
    const rowClass = "flex items-center gap-2 rounded-lg py-1 pr-3 text-xs";
    const style = { paddingLeft: depth * INDENT_PX + 4 + DOCUMENT_OFFSET_PX };
    const name = (
      <TruncatedTooltip label={doc.label}>
        <span className="min-w-0 flex-1 truncate">{doc.label}</span>
      </TruncatedTooltip>
    );

    if (pickable) {
      return (
        <label
          key={doc.collection_id}
          className={cn(rowClass, "cursor-pointer text-foreground transition-colors hover:bg-accent/40")}
          style={style}
        >
          <Checkbox
            checked={ticked.has(doc.collection_id)}
            onCheckedChange={() => onToggleDocument(doc.collection_id)}
            aria-label={`Include ${doc.label}`}
            className="size-3.5 [&_svg]:size-3"
          />
          {name}
        </label>
      );
    }
    return (
      <div key={doc.collection_id} className={cn(rowClass, "text-muted-foreground")} style={style}>
        <FileText aria-hidden="true" className="size-3.5 shrink-0" />
        {name}
        {isExcluded && <span className="shrink-0">{excludedLabel}</span>}
      </div>
    );
  };

  const renderFolder = (folder: Folder, depth: number): ReactNode => {
    const id = folder.folder_id;
    const subfolders = childFolders(folders, id).sort(byName);
    const ownDocuments = documentsByFolder.get(id) ?? [];
    const expandable = subfolders.length > 0 || ownDocuments.length > 0;
    const expanded = expandable && expandedIds.has(id);
    const count = counts.get(id) ?? 0;
    const chosen = id === selectedFolderId;
    let note = count === 0 ? "No documents" : `${count} ${count === 1 ? "document" : "documents"}`;
    if (chosen) {
      const pickedHere = documents.filter(
        (doc) => doc.folder_id && scope.has(doc.folder_id) && ticked.has(doc.collection_id),
      ).length;
      note = `${pickedHere} of ${count} selected`;
    }

    return (
      <div key={id}>
        <div
          onClick={() => expandable && toggleExpanded(id)}
          className={cn(
            "flex items-center gap-2 rounded-lg py-1 pr-3 transition-colors",
            expandable && "cursor-pointer hover:bg-accent/40",
            chosen && "bg-accent",
          )}
          style={{ paddingLeft: depth * INDENT_PX + 4 }}
        >
          {expandable ? (
            <IconButton
              size="sm"
              type="button"
              label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
              aria-expanded={expanded}
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(id);
              }}
              className="size-6 shrink-0"
            >
              {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </IconButton>
          ) : (
            <span aria-hidden="true" className="size-6 shrink-0" />
          )}
          <RadioGroupItem
            {...(id === focusTargetId ? firstControlProps : undefined)}
            value={id}
            disabled={count === 0}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Pick documents from ${folder.name}`}
            className="size-3.5"
          />
          <FolderIcon aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
          <TruncatedTooltip label={folder.name}>
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">{folder.name}</span>
          </TruncatedTooltip>
          <span className="shrink-0 text-xs text-muted-foreground">{note}</span>
        </div>
        {expanded && (
          <>
            {subfolders.map((child) => renderFolder(child, depth + 1))}
            {ownDocuments.map((doc) => renderDocument(doc, depth + 1))}
          </>
        )}
      </div>
    );
  };

  return (
    <RadioGroup
      value={selectedFolderId}
      onValueChange={selectFolder}
      className={cn("block", className)}
      {...aria}
    >
      {roots.map((folder) => renderFolder(folder, 0))}
    </RadioGroup>
  );
}
