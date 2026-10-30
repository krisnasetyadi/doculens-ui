import type { GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";

interface SearchableRun {
  framework_name: string;
  reference_collection_ids: string[];
  target_collection_ids: string[];
}

/** Runs whose framework or any of whose documents (reference or company) contains `query`,
 * ignoring case and the spaces around it. `labelOf` turns a collection id into its name. */
export function filterRuns<T extends SearchableRun>(runs: T[], query: string, labelOf: (id: string) => string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return runs;
  return runs.filter((run) =>
    [run.framework_name, ...[...run.reference_collection_ids, ...run.target_collection_ids].map(labelOf)].some((text) =>
      text.toLocaleLowerCase().includes(needle),
    ),
  );
}

/** The order a result's counts are shown in, best first. */
export const SUMMARY_ORDER: GapItemStatus[] = ["met", "partial", "not_met", "unknown"];

/** "45s", "3m 05s", "1h 02m": how long an analysis has been running. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}
