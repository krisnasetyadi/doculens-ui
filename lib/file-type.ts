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

