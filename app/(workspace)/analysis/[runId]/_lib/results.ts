// Type-only imports: `node --test` runs this file as is, and it cannot resolve extensionless paths.
import type {
  GapAnalysisItem,
  GapAnalysisPointer,
  GapCorrectionKind,
  GapItemStatus,
  GapNextStepAction,
} from "@/services/gap-analysis/type/gap-analysis.type";
import type { TextContentAnchor } from "@/services/pdf-collections/type/pdf-collection.type";

/** Groups in the order they are worked through: what needs doing first. */
export const GROUP_ORDER: GapItemStatus[] = ["missing", "incomplete", "needs_decision", "done", "not_applicable"];
/** The statuses that are "things to do". */
export const TODO_STATUSES: GapItemStatus[] = ["missing", "incomplete", "needs_decision"];
/** The summary's rows, top to bottom: what needs doing first, then what is finished. */
export const SUMMARY_ROWS: GapItemStatus[] = ["missing", "incomplete", "needs_decision", "done", "not_applicable"];

export type ResultTab = "todo" | "done" | "all";

export const TAB_LABEL: Record<ResultTab, string> = { todo: "To do", done: "Done", all: "All" };

/** Rows shown per group before "Show N more". */
export const GROUP_LIMIT = 3;

const isStatus = (status: string): status is GapItemStatus => (GROUP_ORDER as string[]).includes(status);

/** The tab an item belongs to besides All: To do for what needs doing, Done for the rest. */
export function tabOf(status: GapItemStatus): Exclude<ResultTab, "all"> {
  return TODO_STATUSES.includes(status) ? "todo" : "done";
}

export function inTab(status: GapItemStatus, tab: ResultTab): boolean {
  return tab === "all" || tabOf(status) === tab;
}

/** An item's id on the page: its requirement key, or its position for runs stored before keys existed. */
export function itemKey(item: GapAnalysisItem, index: number): string {
  return item.requirement_key ?? `#${index}`;
}

export interface KeyedItem {
  key: string;
  item: GapAnalysisItem & { status: GapItemStatus };
}

/** The items the page lists: not_checked ones are left out (they are only counted). */
export function checkedItems(items: GapAnalysisItem[]): KeyedItem[] {
  return items.flatMap((item, index) =>
    isStatus(item.status) ? [{ key: itemKey(item, index), item: item as KeyedItem["item"] }] : [],
  );
}

export function tabCounts(items: KeyedItem[]): Record<ResultTab, number> {
  return {
    todo: items.filter(({ item }) => inTab(item.status, "todo")).length,
    done: items.filter(({ item }) => inTab(item.status, "done")).length,
    all: items.length,
  };
}

export interface ResultGroup {
  status: GapItemStatus;
  total: number;
  rows: KeyedItem[];
  hidden: number;
}

/** A tab's items by status, in GROUP_ORDER. A group shows GROUP_LIMIT rows until expanded; the
 * selected row always stays visible, even past the limit. Empty groups are left out. */
export function groupItems(
  items: KeyedItem[],
  tab: ResultTab,
  selectedKey: string | null,
  expanded: ReadonlySet<GapItemStatus>,
): ResultGroup[] {
  return GROUP_ORDER.filter((status) => inTab(status, tab)).flatMap((status) => {
    const all = items.filter(({ item }) => item.status === status);
    if (all.length === 0) return [];
    const rows = expanded.has(status)
      ? all
      : all.filter((entry, i) => i < GROUP_LIMIT || entry.key === selectedKey);
    return [{ status, total: all.length, rows, hidden: all.length - rows.length }];
  });
}

/** The item the page opens on: the first thing to do, else the first item at all. */
export function firstItemKey(items: KeyedItem[]): string | null {
  for (const status of GROUP_ORDER) {
    const found = items.find(({ item }) => item.status === status);
    if (found) return found.key;
  }
  return null;
}

export function todoCount(summary: Partial<Record<GapItemStatus, number>>): number {
  return TODO_STATUSES.reduce((sum, status) => sum + (summary[status] ?? 0), 0);
}

/** "Improved since the check on 5 Nov" and friends; null when there is nothing to compare. */
export function trendText(trend: GapAnalysisItem["trend"], since: string | null): string | null {
  if (!trend) return null;
  const when = since ? ` since the check on ${since}` : " since the last check";
  if (trend === "improved") return `Improved${when}`;
  if (trend === "worse") return `Worse${when}`;
  return `No change${when}`;
}

// ---------------------------------------------------------------------------
// Pointers and the next step
// ---------------------------------------------------------------------------

export type PointerOpen =
  | { mode: "pdf"; page: number }
  | { mode: "text"; anchor: TextContentAnchor }
  | { mode: "download" };

const TEXT_PREVIEW_EXTS = new Set(["docx", "xlsx", "pptx", "txt"]);

/** A pointer opens only when it names the collection its file lives in; older index chunks may not. */
export function canOpen(pointer: GapAnalysisPointer | null): pointer is OpenablePointer {
  return !!pointer?.collection_id;
}

export type OpenablePointer = GapAnalysisPointer & { collection_id: string };

/** Where in its file a pointer points, without the file name: "p. 3", "Slide 4",
 * "Section 4. Restore, paragraph 2", "Access, row 7". Null when it names the whole file. */
export function pointerPlace(pointer: GapAnalysisPointer): string | null {
  const { kind, page, section, paragraph, sheet, row } = pointer;
  if (kind === "pdf" && page) return `p. ${page}`;
  if (kind === "slide" && page) return `Slide ${page}`;
  if (kind === "docx" && paragraph) return section ? `Section ${section}, paragraph ${paragraph}` : `Paragraph ${paragraph}`;
  if (kind === "xlsx" && row) return sheet ? `${sheet}, row ${row}` : `Row ${row}`;
  return null;
}

/** How a pointer opens: a PDF in the viewer at its page; Word, Excel, slides and text in the text
 * preview at the paragraph, row or slide; anything else is downloaded. */
export function pointerOpen(pointer: GapAnalysisPointer): PointerOpen {
  const ext = pointer.file_name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { mode: "pdf", page: pointer.page ?? 1 };
  if (!TEXT_PREVIEW_EXTS.has(ext)) return { mode: "download" };
  if (ext === "pptx") return { mode: "text", anchor: pointer.page ? { slide: pointer.page } : {} };
  if (ext === "docx" && pointer.paragraph) {
    return {
      mode: "text",
      anchor: { section: pointer.section, sectionIndex: pointer.section_index ?? null, paragraph: pointer.paragraph },
    };
  }
  if (ext === "xlsx" && pointer.row && pointer.sheet) return { mode: "text", anchor: { sheet: pointer.sheet, row: pointer.row } };
  return { mode: "text", anchor: {} };
}

/** The detail panel's one primary button: open the place the AI points at, decide the status, or
 * go to Sources to upload. */
export type NextStepButton = { label: string; explain: string } & (
  | { kind: "open"; pointer: GapAnalysisPointer }
  | { kind: "decide" }
  | { kind: "upload" }
);

const NEXT_STEP_EXPLAIN: Record<GapNextStepAction, string> = {
  upload_document: "Write the document, then upload it to Sources. The AI checks it on the next run.",
  add_evidence: "Upload the record that shows this was carried out.",
  revise_document: "Open the document at the place the AI points to and add what is missing.",
  decide_status: "The AI could not settle this. Read what it found, then set the right status.",
};

/** Writing the missing part with AI and attaching proof arrive with MS-1117 and MS-1116. Until
 * then, revising opens the place the AI points at, and anything without such a place is an upload.
 * Every Needs your decision item is decided in the correction dialog (MS-1115), also one the AI
 * gave no answer for, which has no next step of its own. Where an item can't be corrected
 * (`canDecide: false`, it has no id), deciding opens the place the AI points at instead. */
export function nextStepButton(item: GapAnalysisItem, { canDecide = true } = {}): NextStepButton | null {
  const deciding = item.status === "needs_decision" || item.next_step?.action === "decide_status";
  if (deciding && canDecide) {
    return { label: "Decide the status", explain: item.next_step?.explain || NEXT_STEP_EXPLAIN.decide_status, kind: "decide" };
  }
  if (!item.next_step) return null;
  const { action } = item.next_step;
  const explain = item.next_step.explain || NEXT_STEP_EXPLAIN[action];
  const pointer = item.findings.map((f) => f.location).find(canOpen);

  if (action === "decide_status") return pointer ? { label: "Review in document", explain, kind: "open", pointer } : null;
  if (pointer && action === "revise_document") return { label: "Open in document", explain, kind: "open", pointer };
  if (action === "add_evidence") return { label: "Upload evidence", explain, kind: "upload" };
  return { label: "Upload document", explain, kind: "upload" };
}

// ---------------------------------------------------------------------------
// Corrections (MS-1115)
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<GapItemStatus | "not_checked", string> = {
  done: "Done",
  incomplete: "Incomplete",
  missing: "Missing",
  needs_decision: "Needs your decision",
  not_applicable: "Not applicable",
  not_checked: "Not checked",
};

/** "Corrected by Dewi · AI said Missing", or null for an item nobody corrected. */
export function correctionNote(item: GapAnalysisItem): string | null {
  if (!item.correction) return null;
  const by = item.correction.corrected_by_name ? ` by ${item.correction.corrected_by_name}` : "";
  const ai = item.ai_status ? ` · AI said ${STATUS_LABEL[item.ai_status]}` : "";
  return `Corrected${by}${ai}`;
}

/** The direction "Remember for next checks" adds to the rule set, as the server words it:
 * "A.8.26: The requirements are in MLT-PO-P03. Evidence: MLT-PO-P03.docx (Section 2)." */
export function rememberedDirection(
  item: Pick<GapAnalysisItem, "code" | "label">,
  correction: { kind: GapCorrectionKind; reason: string; fileName?: string | null; section?: string | null },
): string {
  const name = item.code || item.label || "This requirement";
  const reason = correction.reason.trim();
  if (correction.kind === "not_applicable") return `${name} does not apply to us: ${reason}`;
  const section = correction.section?.trim() ? ` (${correction.section.trim()})` : "";
  const where = correction.kind === "missed_document" && correction.fileName ? ` Evidence: ${correction.fileName}${section}.` : "";
  return `${name}: ${reason}${where}`;
}

/** "Searched 2 folders (5 documents)" for the run's own search scope. */
export function searchedText(searched: { folders: string[]; document_count: number } | null): string | null {
  if (!searched) return null;
  const docs = `${searched.document_count} document${searched.document_count === 1 ? "" : "s"}`;
  if (searched.folders.length === 0) return docs;
  return `${searched.folders.length === 1 ? searched.folders[0] : `${searched.folders.length} folders`} (${docs})`;
}
