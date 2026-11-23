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

/** Where a text preview opens instead of `offset`: a .pptx slide's "Slide N" line (MS-910), a .docx
 * paragraph within its section, or an .xlsx row within its sheet (a gap analysis pointer, MS-1112). */
export interface TextContentAnchor {
  slide?: number;
  section?: string | null;
  /** Which heading the section is (1 = first), so two sections with the same title are told apart. */
  sectionIndex?: number | null;
  paragraph?: number;
  sheet?: string;
  row?: number;
}

export interface PdfCollectionTextContentRequest extends TextContentAnchor {
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
  /** The line_number the request's anchor landed on, to highlight; null without one. */
  target_line?: number | null;
}
