import { z } from "zod";

import type {
  GapAnalysisCorrectionRequest,
  GapAnalysisItem,
  GapCorrectableStatus,
  GapCorrectionKind,
} from "@/services/gap-analysis/type/gap-analysis.type";

/** What was wrong, as the dialog offers it (MS-1115). */
export const CORRECTION_KINDS: { value: GapCorrectionKind; label: string; description: string }[] = [
  { value: "missed_document", label: "AI missed a document", description: "The proof is in a document the AI did not read" },
  { value: "wrong_status", label: "The status is not right", description: "The AI misread what the documents say" },
  { value: "not_applicable", label: "Not applicable to us", description: "For example, excluded in the Statement of Applicability" },
];

/** The statuses a person can set, in the order the dialog offers them. */
export const CORRECTABLE_STATUSES: { value: GapCorrectableStatus; label: string }[] = [
  { value: "done", label: "Done" },
  { value: "incomplete", label: "Incomplete" },
  { value: "missing", label: "Missing" },
  { value: "not_applicable", label: "Not applicable" },
];

/** A document as the picker names it: "<collection id>::<file name>". */
export const documentValue = (collectionId: string, fileName: string) => `${collectionId}::${fileName}`;

export function parseDocumentValue(value: string): { collection_id: string; file_name: string } | null {
  const at = value.indexOf("::");
  return at > 0 ? { collection_id: value.slice(0, at), file_name: value.slice(at + 2) } : null;
}

export const correctionSchema = z
  .object({
    kind: z.enum(["missed_document", "wrong_status", "not_applicable"]),
    status: z.enum(["done", "incomplete", "missing", "not_applicable", ""]),
    document: z.string(),
    section: z.string().trim().max(200, "Keep the section under 200 characters"),
    reason: z.string().trim().min(1, "Enter a short reason").max(500, "Keep the reason under 500 characters"),
    remember: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "missed_document" && !parseDocumentValue(values.document)) {
      ctx.addIssue({ code: "custom", path: ["document"], message: "Choose the document the AI missed" });
    }
    if (values.kind !== "not_applicable" && !values.status) {
      ctx.addIssue({ code: "custom", path: ["status"], message: "Choose the right status" });
    }
  });
export type CorrectionValues = z.infer<typeof correctionSchema>;

/** Where the dialog starts: an item already corrected, from its correction (to change it); an item
 * the AI could not settle, as a status to decide; any other, most often, a document the AI missed. */
export function correctionDefaults(item: GapAnalysisItem): CorrectionValues {
  const current = item.correction;
  if (current) {
    const document = current.document?.collection_id ? documentValue(current.document.collection_id, current.document.file_name) : "";
    return {
      kind: current.kind,
      status: current.kind === "not_applicable" ? "" : current.status,
      document,
      section: current.document?.section ?? "",
      reason: current.reason,
      remember: false,
    };
  }
  return {
    kind: item.status === "needs_decision" ? "wrong_status" : "missed_document",
    status: "",
    document: "",
    section: "",
    reason: "",
    remember: false,
  };
}

/** The request the dialog sends. "Not applicable to us" always sets not_applicable. */
export function correctionRequest(values: CorrectionValues): GapAnalysisCorrectionRequest {
  const status = values.kind === "not_applicable" ? "not_applicable" : (values.status as GapCorrectableStatus);
  const document = values.kind === "missed_document" ? parseDocumentValue(values.document) : null;
  return {
    kind: values.kind,
    status,
    reason: values.reason.trim(),
    document: document ? { ...document, section: values.section.trim() || null } : null,
    remember: values.remember,
  };
}
