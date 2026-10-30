import type { PlainTextLineRow } from "@/services/types";

export interface PdfCollection {
  collection_id: string;
  document_count: number;
  created_at: string;
  file_names: string[];
  title?: string;
  status?: "active" | "inactive";
  folder_id?: string;
  /** Flagged in Sources as a reference framework; only these are offered as the gap analysis reference (MS-848). */
  is_reference_framework?: boolean;
}

export interface SetPdfCollectionActiveRequest {
  collection_id: string;
  active: boolean;
}

export interface SetReferenceFrameworkRequest {
  collection_id: string;
  is_reference_framework: boolean;
}

export interface PdfCollectionTextContentRequest {
  collectionId: string;
  fileName: string;
  offset: number;
  limit: number;
  /** A .pptx deck only: start at this slide's "Slide N" line instead of `offset` (MS-910). */
  slide?: number;
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
