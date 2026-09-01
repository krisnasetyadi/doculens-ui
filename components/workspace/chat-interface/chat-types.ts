import type { PdfSourceInfo } from "@/services";
import type { SourceKey } from "@/hooks/use-source-inventory";

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

// MS-237: how many of the most recent messages get sent as `memory` on
// every question (poin 1), and how many messages GET /sessions/{id} returns
// per page (poin 2-3) — both literally "5" per the spec, not 5 question/
// answer pairs. TOC_MIN_TURNS is the minimum user turns before the
// navigation rail (poin 6) shows itself at all.
export const MEMORY_WINDOW = 5;
export const PAGE_SIZE = 5;
export const TOC_MIN_TURNS = 5;

/** `sourceKey` is undefined for the general question — clicking it leaves
 * whatever the user last had toggled on as-is instead of guessing a source. */
export const SUGGESTED_QUESTIONS: Array<{ label: string; sourceKey?: SourceKey }> = [
  { label: "Summarize my PDFs", sourceKey: "pdf" },
  { label: "Search my database for recent records", sourceKey: "db" },
  { label: "What's in my chat logs?", sourceKey: "chat" },
  { label: "What can I ask this assistant?" },
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

/** Shared "/" filter — same matching rule everywhere the command menu can be
 * triggered from (active chat composer, Home hero input, ...). */
export function filterSlashCommands(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  return SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().startsWith(input.toLowerCase()) ||
      c.label.toLowerCase().includes(input.slice(1).toLowerCase()),
  );
}
