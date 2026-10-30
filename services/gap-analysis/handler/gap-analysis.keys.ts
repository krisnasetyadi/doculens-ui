export const gapAnalysisKeys = {
  all: ["gap-analysis"] as const,
  runs: () => [...gapAnalysisKeys.all, "runs"] as const,
  run: (runId: string) => [...gapAnalysisKeys.all, "run", runId] as const,
};
