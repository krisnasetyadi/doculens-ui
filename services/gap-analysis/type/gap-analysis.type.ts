// Generic "Reference Framework Gap Analysis" capability. `skill_id` selects
// behavior; ISO 27001 is just the first framework_name used with
// "compliance_gap_check" — nothing here is ISO-specific.

export type SkillId = "compliance_gap_check" | "scenario_regulatory_impact";
export type GapItemStatus = "met" | "partial" | "not_met" | "unknown";

export interface GapAnalysisRequest {
  skill_id: SkillId;
  reference_collection_ids: string[]; // array from day one — supports checking multiple frameworks in one run later
  framework_name: string;
  target_collection_ids: string[]; // required for compliance_gap_check — one guideline vs N files, verdict per file
  scenario_input?: string | null; // used by scenario_regulatory_impact instead of a target collection
}

export interface GapAnalysisItem {
  label: string;
  status: GapItemStatus;
  evidence?: string | null;
  source_citation?: string | null;
  recommendation?: string | null;
  target_collection_id?: string | null; // which target collection/file this item was checked against
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
}

export interface GapAnalysisResponse {
  run: GapAnalysisRun;
  items: GapAnalysisItem[];
  summary: Record<GapItemStatus, number>;
  disclaimer?: string | null;
}

/** A run in the history list: its result counts per status, and for an admin who ran it. */
export interface GapAnalysisRunListItem extends GapAnalysisRun {
  summary: Record<GapItemStatus, number>;
  /** The owner's email; only sent to admins, who are the only ones seeing other people's runs. */
  run_by: string | null;
}

export interface RunDeletedResponse {
  run_id: string;
  deleted: boolean;
}

export type GapAnalysisExportFormat = "markdown" | "pdf";
