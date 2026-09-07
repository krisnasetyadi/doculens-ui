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

// MS-237: everything here is counted in *chats*, where one chat is one
// question plus the answer that came back — not one message row. So
// MEMORY_CHATS = 5 sends the last 5 exchanges (up to ~10 messages) as
// `memory` on every question (poin 1), and PAGE_CHATS = 5 asks
// GET /sessions/{id} for 5 whole exchanges per page (poin 2-3).
// TOC_MIN_CHATS is the minimum before the navigation rail (poin 5) appears —
// below it the whole thread fits on screen anyway, so a rail would just be
// decoration. The rail draws one dash per chat with no numeric cap: what
// limits it is the height it's given, not a magic number (see chat-toc.tsx).
export const MEMORY_CHATS = 5;
export const PAGE_CHATS = 5;
export const TOC_MIN_CHATS = 4;
// How much of a question is kept as its one-line label in the navigation
// rail's hover tooltip. Matches the truncation the server applies to its
// index, so a locally-known question and a fetched one read the same length.
export const QUESTION_PREVIEW_LENGTH = 120;

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
  { command: "/usage", label: "Usage", description: "Lihat ringkasan token usage kamu" },
  { command: "/help", label: "Help", description: "Lihat semua command yang tersedia" },
];

/** Shared "/" filter — same matching rule everywhere the command menu can be
 * triggered from (active chat composer, Home hero input). `skillCommands`
 * (MS-252: the user's own uploaded Skills, mapped via toSkillCommands below)
 * is merged in on top of the fixed list — optional and defaulted, so a
 * caller that hasn't fetched Skills yet still works, just without them. */
export function filterSlashCommands(input: string, skillCommands: SlashCommand[] = []): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const all = [...SLASH_COMMANDS, ...skillCommands];
  return all.filter(
    (c) =>
      c.command.toLowerCase().startsWith(input.toLowerCase()) ||
      c.label.toLowerCase().includes(input.slice(1).toLowerCase()),
  );
}

/** MS-252: shapes a user's Skills into the "/" menu's shared SlashCommand
 * format. Drops any whose slash_command collides with a reserved static
 * command — that command always wins (see SLASH_COMMANDS) — so the same
 * rule applies consistently wherever this is called from. */
export function toSkillCommands(skills: { slash_command: string; name: string; description: string }[]): SlashCommand[] {
  return skills
    .filter((s) => !SLASH_COMMANDS.some((c) => c.command === s.slash_command))
    .map((s) => ({ command: s.slash_command, label: s.name, description: s.description || "Skill" }));
}

/** MS-252: splits "/command rest of the message" into its leading token and
 * the remainder (empty until a space is typed — `hasSpace` tells a plain
 * empty remainder apart from "/command " with trailing whitespace only).
 * The one rule every composer uses to tell "still typing the command name"
 * apart from "command done, now typing the message" — see
 * chat-composer.tsx, useChatThread's handleSubmit, and the Home hero
 * input's submit. */
export function splitLeadingCommand(input: string): { leadingCommand: string; remainder: string; hasSpace: boolean } {
  const firstSpace = input.indexOf(" ");
  return firstSpace === -1
    ? { leadingCommand: input, remainder: "", hasSpace: false }
    : { leadingCommand: input.slice(0, firstSpace), remainder: input.slice(firstSpace + 1).trim(), hasSpace: true };
}
