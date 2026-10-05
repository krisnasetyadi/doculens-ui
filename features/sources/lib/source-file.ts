import { toast } from "@/hooks/use-toast";
import { filesApi } from "@/services/files/handler/files.api";

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
 * them. The caller owns the URL and must revoke it. Note the blob keeps only
 * the response's MIME type: `Content-Disposition`, filename included, is
 * dropped on the floor, which is why every caller below has to supply the
 * name itself. */
export async function fetchFileAsBlobUrl(url: string): Promise<string> {
  return URL.createObjectURL(await filesApi.getBlob(url));
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
