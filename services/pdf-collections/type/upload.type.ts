/** Where the backend stores the uploaded file (`router/upload.py`). */
export type PdfPersistMode = "auto" | "local" | "database";

export interface UploadResponse {
  collection_id: string;
  file_count: number;
  status: string;
  file_names?: string[];
  title?: string;
  /** Set when part of the file could not be indexed, e.g. scanned pages OCR skipped (MS-908). */
  notice?: string | null;
}

export interface UploadFromUrlsRequest {
  urls: string[];
  title?: string;
}
