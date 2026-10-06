/** Where the backend stores the uploaded file (`router/upload.py`). */
export type PdfPersistMode = "auto" | "local" | "database";

export interface UploadResponse {
  collection_id: string;
  file_count: number;
  status: string;
  file_names?: string[];
  title?: string;
}

export interface UploadFromUrlsRequest {
  urls: string[];
  title?: string;
}
