import RequestHandler from "@/services/request-handler";
import { GAP_ANALYSIS_ENDPOINT } from "../endpoint";
import type {
  GapAnalysisExportFormat,
  GapAnalysisRequest,
  GapAnalysisResponse,
  GapAnalysisRunListItem,
  RunDeletedResponse,
} from "../type/gap-analysis.type";

const api = new RequestHandler(GAP_ANALYSIS_ENDPOINT.BASE);

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

  /** The report as a file, for the caller to save. */
  exportRun: ({ runId, format }: { runId: string; format: GapAnalysisExportFormat }): Promise<Blob> =>
    api.findBlob(`${encodeURIComponent(runId)}/${GAP_ANALYSIS_ENDPOINT.EXPORT}`, { format }),
};
