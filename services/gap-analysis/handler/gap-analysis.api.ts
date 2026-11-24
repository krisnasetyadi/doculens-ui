import RequestHandler from "@/services/request-handler";
import { GAP_ANALYSIS_ENDPOINT } from "../endpoint";
import type {
  GapAnalysisCorrectionRequest,
  GapAnalysisExportFormat,
  GapAnalysisRequest,
  GapAnalysisResponse,
  GapAnalysisRunListItem,
  RunDeletedResponse,
} from "../type/gap-analysis.type";

const api = new RequestHandler(GAP_ANALYSIS_ENDPOINT.BASE);

const correctionPath = (runId: string, itemId: number) =>
  `${encodeURIComponent(runId)}/${GAP_ANALYSIS_ENDPOINT.ITEMS}/${itemId}/${GAP_ANALYSIS_ENDPOINT.CORRECTION}`;

export const gapAnalysisApi = {
  run: (body: GapAnalysisRequest): Promise<GapAnalysisResponse> => api.store<GapAnalysisResponse>(body),

  listRuns: async (): Promise<GapAnalysisRunListItem[]> => {
    const data = await api.find<GapAnalysisRunListItem[]>(GAP_ANALYSIS_ENDPOINT.RUNS);
    return Array.isArray(data) ? data : [];
  },

  getRun: (runId: string): Promise<GapAnalysisResponse> =>
    api.find<GapAnalysisResponse>(encodeURIComponent(runId)),

  deleteRun: (runId: string): Promise<RunDeletedResponse> =>
    api.delete<RunDeletedResponse>(encodeURIComponent(runId)),

  /** Correct an item's status (MS-1115); resolves with the whole run as it now reads. */
  correctItem: ({ runId, itemId, body }: { runId: string; itemId: number; body: GapAnalysisCorrectionRequest }): Promise<GapAnalysisResponse> =>
    api.update<GapAnalysisResponse>(correctionPath(runId, itemId), body),

  /** Undo an item's correction; resolves with the whole run as it now reads. */
  undoCorrection: ({ runId, itemId }: { runId: string; itemId: number }): Promise<GapAnalysisResponse> =>
    api.delete<GapAnalysisResponse>(correctionPath(runId, itemId)),

  /** The report as a file, for the caller to save. */
  exportRun: ({ runId, format }: { runId: string; format: GapAnalysisExportFormat }): Promise<Blob> =>
    api.findBlob(`${encodeURIComponent(runId)}/${GAP_ANALYSIS_ENDPOINT.EXPORT}`, { format }),
};
