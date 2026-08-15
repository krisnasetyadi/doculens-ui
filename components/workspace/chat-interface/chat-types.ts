import type { PdfSourceInfo } from "@/services";

export interface PdfViewerState {
  open: boolean;
  pdfUrl: string;
  fileName: string;
  page?: number;
  searchText?: string;
  contentPreview?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  sources?: {
    pdf_sources?: string[];
    pdf_sources_detailed?: PdfSourceInfo[];
    db_results?: Record<
      string,
      {
        table: string;
        data: any[];
        record_count: number;
        avg_relevance_score?: number | null;
      }
    >;
    chat_results?: any[];
    processing_time?: number;
    search_terms?: string[];
    target_tables?: string[];
  };
}

export const SUGGESTED_QUESTIONS = [
  "Summarize my PDFs",
  "Search my database for recent records",
  "What's in my chat logs?",
  "What can I ask this assistant?",
];

// "/" command menu — always-available discovery, deterministic (UI-driven,
// not LLM-generated), so it's never wrong about what actually exists.
// "/scenario" (Skill 2) intentionally left out — it's scaffold-only on the
// backend and not validated for real use yet. List can be reworked freely
// as more commands/adjustments come in.
export interface SlashCommand {
  command: string;
  label: string;
  description: string;
}

// Floating alias to Google's current-recommended flash model — survives
// Gemini version transitions (unlike a pinned name such as "gemini-2.5-flash",
// which 404s on API keys/projects created after Google's cutoff for it).
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/gap-check", label: "Gap Check", description: "Jalankan Compliance Gap Check (Skill 1)" },
  { command: "/collections", label: "Collections", description: "Lihat daftar collection dokumen kamu" },
  { command: "/history", label: "History", description: "Lihat riwayat gap-analysis run sebelumnya" },
  { command: "/upload", label: "Upload", description: "Upload dokumen baru" },
  { command: "/help", label: "Help", description: "Lihat semua command yang tersedia" },
];
