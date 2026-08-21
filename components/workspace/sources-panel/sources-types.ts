import type dayjs from "dayjs";
import { getAuthHeader } from "@/stores/auth-store";

export const MAX_FILES_PER_SECTION = 20;
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** Hide the `user:pass@` userinfo segment of a connection string so a saved
 * DB password isn't sitting in plaintext on screen after the connect dialog closes. */
export function maskConnectionUrl(url: string): string {
  return url.replace(/:\/\/([^@/]+)@/, "://••••@");
}

/** Open a backend file URL that requires the Authorization header. A plain
 * `window.open`/`<a href>` navigation can't attach that header, so it 401s —
 * fetch the file with auth first and hand the new tab an object URL instead.
 * The tab is opened synchronously so popup blockers still see it as a
 * direct result of the click. */
export async function openAuthenticatedFile(url: string) {
  const win = window.open("", "_blank");
  try {
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error(`Failed to open file (${res.status})`);
    const blobUrl = URL.createObjectURL(await res.blob());
    if (win) win.location.href = blobUrl;
  } catch (err) {
    if (win) win.document.body.innerText = err instanceof Error ? err.message : "Failed to open file.";
  }
}

export type UploadStatus = "uploading" | "success" | "error";
export type SortKey = "name" | "date";
export type SortDir = "asc" | "desc";
export type Tab = "files" | "link" | "chat" | "database";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export function toggleSort(
  current: SortState,
  key: SortKey,
  setter: (next: SortState) => void,
) {
  setter(
    current.key === key
      ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "asc" },
  );
}

/** How one picked file ended up. Files are uploaded in parallel but only a
 * single toast is on screen at a time, so outcomes are collected and the whole
 * batch is reported once instead of each file racing to toast over the others. */
export interface UploadOutcome {
  name: string;
  /** Set when the file never made it in — failed validation or a failed request. */
  error?: string;
}

export interface SourceFile {
  id: string;
  name: string;
  uploadedAt: dayjs.Dayjs;
  status: UploadStatus;
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
}

export interface SourcesPanelProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
  onPublicLinkIdsChange?: (ids: string[]) => void;
  onDbConnectionIdsChange?: (ids: string[]) => void;
}
