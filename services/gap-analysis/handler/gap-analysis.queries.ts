import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { gapAnalysisApi } from "./gap-analysis.api";
import { gapAnalysisKeys } from "./gap-analysis.keys";

export const gapAnalysisQueries = {
  runs: () =>
    queryOptions({
      queryKey: gapAnalysisKeys.runs(),
      queryFn: gapAnalysisApi.listRuns,
    }),

  run: (runId: string) =>
    queryOptions({
      queryKey: gapAnalysisKeys.run(runId),
      queryFn: () => gapAnalysisApi.getRun(runId),
    }),

  /** Rule sets a new check can reuse (MS-1114). */
  analyses: () =>
    queryOptions({
      queryKey: gapAnalysisKeys.analyses(),
      queryFn: gapAnalysisApi.listAnalyses,
    }),
};

export const gapAnalysisMutations = {
  /** A finished run is saved by the server, so the history list gains it, and its analysis can be reused. */
  run: () =>
    mutationOptions({
      mutationFn: gapAnalysisApi.run,
      meta: { invalidates: [gapAnalysisKeys.runs(), gapAnalysisKeys.analyses()] },
    }),

  /** Reads only: what the AI suggests changes nothing cached. */
  suggestSetup: () =>
    mutationOptions({
      mutationFn: gapAnalysisApi.suggestSetup,
    }),

  draftRequirements: () =>
    mutationOptions({
      mutationFn: gapAnalysisApi.draftRequirements,
    }),

  delete: () =>
    mutationOptions({
      mutationFn: gapAnalysisApi.deleteRun,
      meta: { invalidates: [gapAnalysisKeys.runs()] },
    }),

  /** Downloads the report; nothing cached changes. */
  export: () =>
    mutationOptions({
      mutationFn: gapAnalysisApi.exportRun,
    }),
};
