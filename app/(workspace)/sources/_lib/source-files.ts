import { getFileTypeLabel } from "@/lib/file-type";
import type { SourceFile } from "../_types/sources.type";

export const MAX_FILES_PER_SECTION = 20;
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** One label shared by the file icon and File Type sort, including chat exports. */
export function getSourceFileTypeLabel(file: Pick<SourceFile, "kind" | "rawFileName">): string {
  return file.kind === "chat" ? "WhatsApp" : getFileTypeLabel(file.rawFileName) ?? "Other";
}
