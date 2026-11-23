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

/** How each status reads on the results page (MS-1112). */
export const STATUS_META: Record<
  GapItemStatus,
  { label: string; hint: string; badge: "success" | "warning" | "destructive" | "secondary"; bar: string; detailTitle: string }
> = {
  missing: {
    label: "Missing",
    hint: "no document covers it yet",
    badge: "destructive",
    bar: "bg-destructive",
    detailTitle: "What is missing",
  },
  incomplete: {
    label: "Incomplete",
    hint: "the document exists, but something is missing",
    badge: "warning",
    bar: "bg-warning",
    detailTitle: "What is missing",
  },
  needs_decision: {
    label: "Needs your decision",
    hint: "the AI is not sure, you decide",
    badge: "secondary",
    bar: "bg-muted-foreground/40",
    detailTitle: "Why you need to decide",
  },
  done: {
    label: "Done",
    hint: "nothing to do",
    badge: "success",
    bar: "bg-success",
    detailTitle: "Why it is done",
  },
  not_applicable: {
    label: "Not applicable",
    hint: "not counted",
    badge: "secondary",
    bar: "bg-border",
    detailTitle: "Why it does not apply",
  },
};

/** The order a run's counts are shown in, best first. */
export const SUMMARY_ORDER: GapItemStatus[] = ["done", "incomplete", "missing", "needs_decision", "not_applicable"];
