import type { SourceFile } from "../_types/sources.type";

export const MAX_FILES_PER_SECTION = 20;
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

/** One label shared by the file icon and File Type sort, including chat exports. */
export function getSourceFileTypeLabel(file: Pick<SourceFile, "kind" | "rawFileName">): string {
  return file.kind === "chat" ? "WhatsApp" : getFileTypeLabel(file.rawFileName) ?? "Other";
}
