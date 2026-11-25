// Type-only imports: `node --test` runs this file as is, and it cannot resolve extensionless paths.
import type {
  DraftRequirement,
  FolderOption,
  ReusableAnalysis,
  SetupDraft,
} from "@/services/gap-analysis/type/gap-analysis.type";

/** Starting an analysis from one sentence (MS-1114): what the New analysis drawer works out between
 * the user's answers. */

/** Example goals under "What do you want to check?". */
export const GOAL_EXAMPLES = [
  "Are our documents ready for the ISO 27001 internal audit?",
  "Does every project fill in the required development forms?",
  "Which ISO 9001 clauses do our procedures not cover yet?",
];

/** The statuses every requirement can get, as the result page names them. */
export const RESULT_STATUS_LABELS = ["Done", "Incomplete", "Missing", "Needs your decision", "Not applicable"];

/** A folder's key in the picker: its id, or "" for the documents in no folder. */
export const folderKey = (folder: Pick<FolderOption, "folder_id">) => folder.folder_id ?? "";

/** The folders the AI suggested, as the picker starts. */
export function suggestedFolderKeys(folders: FolderOption[]): string[] {
  return folders.filter((f) => f.suggested).map(folderKey);
}

/** The documents in the picked folders (subfolders included), once each, without the rule file:
 * a document is never checked against itself. */
export function documentsInFolders(folders: FolderOption[], picked: string[], ruleFileId: string | null): string[] {
  const chosen = new Set(picked);
  const ids = new Set<string>();
  for (const folder of folders) {
    if (!chosen.has(folderKey(folder))) continue;
    for (const id of folder.collection_ids) if (id !== ruleFileId) ids.add(id);
  }
  return [...ids];
}

/** The folder ids a run names as where the AI searched ("" for no folder is not a folder). */
export function searchedFolderIds(picked: string[]): string[] {
  return picked.filter((key) => key !== "");
}

/** Which requirements start switched on: every one, except those the rule file marks as not
 * applicable. */
export function initiallyOn(requirements: DraftRequirement[]): Set<string> {
  return new Set(requirements.filter((r) => r.applicable !== false).map((r) => r.key));
}

/** The list the run checks: the switched-on requirements, in the rule file's order. */
export function approvedRequirements(requirements: DraftRequirement[], on: ReadonlySet<string>): DraftRequirement[] {
  return requirements.filter((r) => on.has(r.key));
}

/** "Columns read by the AI", "… from the headers", "… as you set them": how the mapping was made. */
export function mappingNote(draft: Pick<SetupDraft, "mapped_by">): string | null {
  if (draft.mapped_by === "ai") return "The AI matched these columns. Check them before you start.";
  if (draft.mapped_by === "guess") return "Matched from the column headers. Check them before you start.";
  if (draft.mapped_by === "user") return "Read with the columns you set.";
  return null;
}

/** "ISO 27001 Moonlay · 93 requirements · last checked 5 Nov 2026". */
export function reusableLabel(analysis: ReusableAnalysis, lastCheckedOn: string | null): string {
  const name = analysis.framework_name || analysis.goal || "Analysis";
  const count = `${analysis.requirement_count} requirement${analysis.requirement_count === 1 ? "" : "s"}`;
  return [name, count, lastCheckedOn ? `last checked ${lastCheckedOn}` : null].filter(Boolean).join(" · ");
}
