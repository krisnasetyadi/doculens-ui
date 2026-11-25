export const gapAnalysisKeys = {
  all: ["gap-analysis"] as const,
  runs: () => [...gapAnalysisKeys.all, "runs"] as const,
  run: (runId: string) => [...gapAnalysisKeys.all, "run", runId] as const,
  /** Analyses whose rule set a new check can reuse (MS-1114). */
  analyses: () => [...gapAnalysisKeys.all, "analyses"] as const,
};
