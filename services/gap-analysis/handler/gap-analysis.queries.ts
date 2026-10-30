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
};

export const gapAnalysisMutations = {
  /** A finished run is saved by the server, so the history list gains it. */
  run: () =>
    mutationOptions({
      mutationFn: gapAnalysisApi.run,
      meta: { invalidates: [gapAnalysisKeys.runs()] },
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
