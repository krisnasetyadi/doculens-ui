import RequestHandler from "@/services/request-handler";
import { GAP_ANALYSIS_ENDPOINT } from "../endpoint";
import type {
  GapAnalysisExportFormat,
  ReusableAnalysis,
  SetupDraft,
  SetupDraftRequest,
  SetupSuggestion,
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

  /** From "What do you want to check?": the rule file and folders the AI suggests (MS-1114). */
  suggestSetup: (goal: string): Promise<SetupSuggestion> =>
    api.storeAt<SetupSuggestion>(GAP_ANALYSIS_ENDPOINT.SETUP_SUGGEST, { goal }),

  /** The requirement list a new analysis would check, for the user to read first (MS-1114). */
  draftRequirements: (body: SetupDraftRequest): Promise<SetupDraft> =>
    api.storeAt<SetupDraft>(GAP_ANALYSIS_ENDPOINT.SETUP_DRAFT, body),

  listAnalyses: async (): Promise<ReusableAnalysis[]> => {
    const data = await api.find<ReusableAnalysis[]>(GAP_ANALYSIS_ENDPOINT.ANALYSES);
    return Array.isArray(data) ? data : [];
  },

  /** The report as a file, for the caller to save. */
  exportRun: ({ runId, format }: { runId: string; format: GapAnalysisExportFormat }): Promise<Blob> =>
    api.findBlob(`${encodeURIComponent(runId)}/${GAP_ANALYSIS_ENDPOINT.EXPORT}`, { format }),
};
