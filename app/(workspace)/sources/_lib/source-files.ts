import { getFileTypeLabel } from "@/lib/file-type";
import type { SourceFile } from "../_types/sources.type";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** One label shared by the file icon and File Type sort, including chat exports. */
export function getSourceFileTypeLabel(file: Pick<SourceFile, "kind" | "rawFileName">): string {
  return file.kind === "chat" ? "WhatsApp" : getFileTypeLabel(file.rawFileName) ?? "Other";
}

/** A plain-text document or a PowerPoint deck (shown slide by slide, MS-910)
 * opens in the formatted text viewer; every other document opens the file. */
export function hasTextPreview(rawFileName?: string): boolean {
  return /\.(txt|pptx)$/i.test(rawFileName ?? "");
}
