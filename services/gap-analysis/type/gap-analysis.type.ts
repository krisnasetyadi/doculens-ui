// Generic "Reference Framework Gap Analysis" capability. `skill_id` selects
// behavior; ISO 27001 is just the first framework_name used with
// "compliance_gap_check" — nothing here is ISO-specific.

export type SkillId = "compliance_gap_check" | "scenario_regulatory_impact";

/** The five statuses a user sees (MS-1112). */
export type GapItemStatus = "done" | "incomplete" | "missing" | "needs_decision" | "not_applicable";
/** A stored item's status: one of the five, or not_checked — its kind of document was not selected.
 * not_checked is never counted in a summary and never shown as missing. */
export type GapItemStoredStatus = GapItemStatus | "not_checked";

export interface GapAnalysisRequest {
  skill_id: SkillId;
  reference_collection_ids: string[]; // array from day one — supports checking multiple frameworks in one run later
  framework_name: string;
  target_collection_ids: string[]; // required for compliance_gap_check — the documents checked
  scenario_input?: string | null; // used by scenario_regulatory_impact instead of a target collection
  /** Run the latest rule set of this analysis again; without it a new analysis is made. */
  analysis_id?: string | null;
  goal?: string | null;
  /** The folders the documents were picked from: a missing item names them as where the AI searched. */
  target_folder_ids?: string[];
}

/** One exact place in a checked document. */
export interface GapAnalysisPointer {
  file_name: string;
  collection_id: string | null;
  kind: "pdf" | "docx" | "xlsx" | "slide" | "file";
  /** PDF page or slide number. */
  page: number | null;
  /** DOCX section heading; null before the first heading. */
  section: string | null;
  /** Which heading the section is (1 = first, 0 = before any), for repeated titles. Missing on
   * pointers stored before it existed. */
  section_index?: number | null;
  /** DOCX paragraph number within its section. */
  paragraph: number | null;
  sheet: string | null;
  /** XLSX row number as Excel shows it. */
  row: number | null;
  /** How it reads, e.g. "Backup.docx · Section 4. Restore, paragraph 2". */
  label: string;
}

export interface GapAnalysisFinding {
  verdict: "met" | "partial" | "missing";
  text: string;
  quote: string | null;
  location: GapAnalysisPointer | null;
  /** Where a missing part of an existing document should go. */
  suggested_place: string | null;
  /** Where the AI looked, for a missing finding. */
  searched: string | null;
  /** The person who pointed at it: a document the AI missed (MS-1115). */
  added_by?: string | null;
}

/** What was wrong when a person corrects the AI's status (MS-1115). */
export type GapCorrectionKind = "missed_document" | "wrong_status" | "not_applicable";
/** The statuses a person can set; needs_decision is what a correction settles. */
export type GapCorrectableStatus = Exclude<GapItemStatus, "needs_decision">;

export interface GapAnalysisCorrectionRequest {
  kind: GapCorrectionKind;
  status: GapCorrectableStatus;
  /** Shown to the team and in the export. */
  reason: string;
  /** Required for missed_document: where the proof is. */
  document?: { collection_id: string; file_name: string; section?: string | null } | null;
  /** Add the correction as a direction to the analysis's rule set for next checks. */
  remember: boolean;
}

export interface GapAnalysisCorrection {
  kind: GapCorrectionKind;
  status: GapCorrectableStatus;
  reason: string;
  document: GapAnalysisPointer | null;
  corrected_by: string | null;
  corrected_by_name: string | null;
  corrected_at: string | null;
  /** The direction "Remember for next checks" added to the rule set. */
  direction: string | null;
  /** Set when the correction was made on an earlier run and kept. */
  carried_from_run_id: string | null;
}

export type GapNextStepAction = "upload_document" | "revise_document" | "add_evidence" | "decide_status";

export interface GapAnalysisSearched {
  folders: string[];
  document_count: number;
}

export interface GapAnalysisItem {
  label: string;
  status: GapItemStoredStatus;
  /** Stable across the runs of one analysis; null on runs stored before MS-1112. */
  requirement_key: string | null;
  code: string | null;
  /** One sentence. */
  reason: string | null;
  /** What is missing, or why it is done. */
  summary: string | null;
  next_step: { action: GapNextStepAction; explain: string | null } | null;
  findings: GapAnalysisFinding[];
  searched: GapAnalysisSearched | null;
  /** Against the previous run of the same analysis; null on a first run. */
  trend: "improved" | "worse" | "unchanged" | null;
  /** False when the AI gave no answer for it in this run: no findings, no trend. */
  answered?: boolean;
  /** Addresses the item for a correction (MS-1115). */
  item_id?: number | null;
  /** The AI's own status; `status` is the corrected one when a person corrected it. */
  ai_status?: GapItemStoredStatus | null;
  correction?: GapAnalysisCorrection | null;
  evidence?: string | null;
  source_citation?: string | null;
  recommendation?: string | null;
  target_collection_id?: string | null;
}

export interface GapAnalysisRun {
  run_id: string;
  skill_id: SkillId;
  framework_name: string;
  reference_collection_ids: string[];
  target_collection_ids: string[];
  scenario_input?: string | null;
  status: string;
  created_at: string;
  /** collection_id -> name for this run's own collections. The reader may not own them (an admin
   * opening a member's run), so their own collection list can't name them. */
  collection_labels: Record<string, string>;
  analysis_id: string | null;
  goal: string | null;
  rule_set_version: number | null;
  target_folder_ids: string[];
  searched: GapAnalysisSearched | null;
  /** The run this one's trends compare against. */
  previous_run_id: string | null;
  previous_run_at: string | null;
}

export interface GapAnalysisResponse {
  run: GapAnalysisRun;
  items: GapAnalysisItem[];
  /** Counts per status; not_checked is left out. */
  summary: Record<GapItemStatus, number>;
  not_checked: number;
  /** Every requirement in the rule set, checked or not. */
  total_requirements: number;
  disclaimer?: string | null;
  /** How many of the AI's statuses were checked, and how many of those a person changed. */
  ai_accuracy?: { checked: number; corrected: number };
}

/** A run in the history list: its result counts per status, and for an admin who ran it. */
/** The history list does not compare runs, so its rows carry no previous run. */
export interface GapAnalysisRunListItem extends Omit<GapAnalysisRun, "previous_run_id" | "previous_run_at"> {
  summary: Record<GapItemStatus, number>;
  not_checked: number;
  /** The owner's email; only sent to admins, who are the only ones seeing other people's runs. */
  run_by: string | null;
}

export interface RunDeletedResponse {
  run_id: string;
  deleted: boolean;
}

export type GapAnalysisExportFormat = "markdown" | "pdf";
