import type dayjs from "dayjs";
import { getAuthHeader } from "@/stores/auth-store";
import { toast } from "@/hooks/use-toast";

export const MAX_FILES_PER_SECTION = 20;
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** Hide the `user:pass@` userinfo segment of a connection string so a saved
 * DB password isn't sitting in plaintext on screen after the connect dialog closes. */
export function maskConnectionUrl(url: string): string {
  return url.replace(/:\/\/([^@/]+)@/, "://••••@");
}

/** Extensions a browser renders on its own in a tab. Mirrors the backend's
 * INLINE_VIEWABLE_EXTS (utils.py); keep the two in step. Anything outside
 * this set is downloaded rather than previewed, because the browser has
 * nothing to show for it: a tab pointed at a CSV goes blank (Chrome routes
 * text/csv to the download manager, it does not render it) and there is no
 * built-in renderer for the Office formats at all. */
const INLINE_VIEWABLE_EXTS = new Set(["pdf", "txt"]);

export function canPreviewInBrowser(fileName?: string): boolean {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return !!ext && INLINE_VIEWABLE_EXTS.has(ext);
}

/** Last path segment of a backend file URL, decoded. The fallback download
 * name for callers that don't carry the original filename. */
function fileNameFromUrl(url: string): string {
  const last = url.split("?")[0].split("/").pop() || "file";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/** Fetch a backend file URL with the Authorization header and wrap the bytes
 * in an object URL. A plain `window.open`/`<a href>`/`<iframe src>` navigation
 * can't attach that header, so it 401s; an object URL can be handed to any of
 * them. Note the blob keeps only the response's MIME type: `Content-Disposition`,
 * filename included, is dropped on the floor, which is why every caller below
 * has to supply the name itself. */
export async function fetchFileAsBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: getAuthHeader() });
  if (!res.ok) throw new Error(`Failed to open file (${res.status})`);
  return URL.createObjectURL(await res.blob());
}

/** Save a backend file to disk under its real name. Used for every format the
 * browser can't render (MS-414): those used to be opened in a tab anyway,
 * where they either downloaded under the object URL's UUID with no extension
 * or, when the stored content type was wrong, landed in the PDF viewer as
 * "Failed to load PDF document". */
export async function downloadAuthenticatedFile(url: string, fileName?: string) {
  try {
    const blobUrl = await fetchFileAsBlobUrl(url);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || fileNameFromUrl(url);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the download before the browser has
    // finished reading the blob, so let the save get under way first.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    toast({
      title: "Gagal mengunduh file",
      description: err instanceof Error ? err.message : "Coba lagi nanti.",
      variant: "destructive",
    });
  }
}

/** Open a backend file the way its format allows: preview it in a new tab when
 * the browser can render it, otherwise download it under its real name. The
 * tab is opened synchronously so popup blockers still see it as a direct
 * result of the click. The download path needs no popup at all, so the
 * format is checked before anything is opened. */
export async function openAuthenticatedFile(url: string, fileName?: string) {
  const name = fileName || fileNameFromUrl(url);
  if (!canPreviewInBrowser(name)) {
    return downloadAuthenticatedFile(url, name);
  }
  const win = window.open("", "_blank");
  try {
    const blobUrl = await fetchFileAsBlobUrl(url);
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
  /** Folder this source is organized into, if any (MS-274). Undefined/absent
   * means it sits unassigned at the root of the Files tab. */
  folderId?: string;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  csv: "CSV",
  xlsx: "XLSX",
  txt: "TXT",
};

/** Derive the file-type badge label (e.g. "CSV", "PDF") from a document's
 * real filename extension, instead of assuming every non-chat upload is a PDF. */
export function getFileTypeLabel(rawFileName?: string): string | undefined {
  const ext = rawFileName?.split(".").pop()?.toLowerCase();
  return ext ? FILE_TYPE_LABELS[ext] : undefined;
}

export interface SourcesPanelProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
  onPublicLinkIdsChange?: (ids: string[]) => void;
  onDbConnectionIdsChange?: (ids: string[]) => void;
}
