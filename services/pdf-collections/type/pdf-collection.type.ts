import type { PlainTextLineRow } from "@/services/types";

export interface PdfCollection {
  collection_id: string;
  document_count: number;
  created_at: string;
  file_names: string[];
  title?: string;
  status?: "active" | "inactive";
  folder_id?: string;
}

export interface SetPdfCollectionActiveRequest {
  collection_id: string;
  active: boolean;
}

export interface PdfCollectionTextContentRequest {
  collectionId: string;
  fileName: string;
  offset: number;
  limit: number;
}

export interface PdfCollectionTextContentResponse {
  collection_id: string;
  file_name: string;
  total_lines: number;
  offset: number;
  limit: number;
  has_more: boolean;
  lines: PlainTextLineRow[];
}
