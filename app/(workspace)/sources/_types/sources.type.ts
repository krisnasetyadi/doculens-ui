import type dayjs from "dayjs";
import type { UploadStage } from "@/services/upload-progress";

export type UploadStatus = "uploading" | "success" | "error";
export type SortKey = "name" | "date" | "type";
export type SortDir = "asc" | "desc";
export type Tab = "files" | "link" | "chat" | "database";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

/** How one picked file ended up. Files are uploaded in parallel but only a
 * single toast is on screen at a time, so outcomes are collected and the whole
 * batch is reported once instead of each file racing to toast over the others. */
export interface UploadOutcome {
  name: string;
  /** Set when the file never made it in — failed validation or a failed request. */
  error?: string;
  /** The file was uploaded, but could not be placed in the selected folder. */
  warning?: string;
  /** Set when a size or storage limit is why it was refused (MS-504). */
  limit?: "size" | "quota";
  size?: number;
}

export interface SourceFile {
  id: string;
  name: string;
  uploadedAt: dayjs.Dayjs;
  status: UploadStatus;
  /** When a new upload last completed or failed. Only used for its short status badge. */
  finishedAt?: number;
  /** Loading-bar progress while status is "uploading" (0-99; the row flips
   * to "success" once the backend actually reports ready — see
   * _hooks/use-files-tab.ts). */
  progress?: number;
  stage?: UploadStage;
  /** Backend's progress-tracking id for this upload, captured from the
   * first stream event — lets a reload restore this row's real progress
   * instead of leaving it stuck (MS-553). */
  uploadId?: string;
  collectionId?: string;
  meta?: string; // e.g. doc count, message count
  rawFileName?: string;
  title?: string;
  linkedItems?: Array<{
    name: string;
    url: string;
    itemType: "file" | "folder";
  }>;
  /** Whether this collection is used as a knowledge source (distinct from upload `status`). */
  active?: boolean;
  /** Which upload type this came from — the Files tab merges PDF + WhatsApp
   * exports into one list/cap, so rows need a way to tell them apart. */
  kind?: "pdf" | "chat";
  /** Folder this source is organized into, if any (MS-274). Undefined/absent
   * means it sits unassigned at the root of the Files tab. */
  folderId?: string;
}

export interface SourcesPanelProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
  onPublicLinkIdsChange?: (ids: string[]) => void;
  onDbConnectionIdsChange?: (ids: string[]) => void;
}
