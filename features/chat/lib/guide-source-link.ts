import type { PdfSourceInfo } from "../../../services/types";

/** Resolve this API host's file links through its configured origin, including proxy scheme differences. */
export function guideSourceFromUrl(href: string | undefined, apiBase: string): PdfSourceInfo | null {
  if (!href) return null;
  try {
    const base = new URL(apiBase);
    const url = new URL(href, base);
    if (!["http:", "https:"].includes(base.protocol) || !["http:", "https:"].includes(url.protocol)
      || url.host !== base.host || url.username || url.password || url.search) return null;
    const match = /^\/api\/v1\/files\/([^/]+)\/([^/]+)$/.exec(url.pathname);
    if (!match || (url.hash && !/^#page=[1-9]\d*$/.test(url.hash))) return null;
    const collectionId = decodeURIComponent(match[1]);
    const fileName = decodeURIComponent(match[2]);
    if ([collectionId, fileName].some((part) => !part || /[\/\\\0]/.test(part) || part === "." || part === "..")) return null;
    const fileUrl = `${base.origin}/api/v1/files/${encodeURIComponent(collectionId)}/${encodeURIComponent(fileName)}`;
    const page = url.hash ? Number(url.hash.slice(6)) : undefined;
    if (page !== undefined && !Number.isSafeInteger(page)) return null;
    return { collection_id: collectionId, file_name: fileName, page, file_url: fileUrl,
      page_url: page ? `${fileUrl}#page=${page}` : fileUrl };
  } catch {
    return null;
  }
}

/** A deck opens in the in-app slide preview; other files go to the PDF viewer. */
export function isSlideDeck(fileName: string): boolean {
  return /\.pptx$/i.test(fileName);
}

/** Locations are already formatted by the server in the answer's language. */
export function guideSourceLocation(where: string, sourceIndex: number): string {
  return where.split("; ")[sourceIndex] ?? where;
}
