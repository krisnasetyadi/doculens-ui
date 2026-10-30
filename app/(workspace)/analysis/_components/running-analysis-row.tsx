"use client";

import { useEffect, useState } from "react";
import { ChevronRight, RotateCw, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { formatDayAge } from "@/lib/date";
import type { ActiveAnalysis } from "@/stores/analysis-run-store";
import { formatElapsed } from "../_lib/runs";

/** How many company document names the row spells out before "+N more". */
const NAMED_DOCUMENTS = 2;

/** The analysis still running (or just failed), above the saved runs (MS-916). Clicking it opens
 * the New analysis drawer: its progress, or the failed run's inputs for another try. */
export function RunningAnalysisRow({ active, onOpen }: { active: ActiveAnalysis; onOpen: () => void }) {
  const running = active.status === "running";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const named = active.documentNames.slice(0, NAMED_DOCUMENTS).join(", ");
  const more = active.documentNames.length - NAMED_DOCUMENTS;
  const documents = more > 0 ? `${named} +${more} more` : named;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-xl border border-primary/30 bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-accent/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {running ? <Spinner className="size-4" /> : <TriangleAlert className="size-4 text-destructive" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-manrope text-sm font-bold text-foreground">{active.frameworkName}</span>
        <span className="block truncate text-xs text-muted-foreground">{documents}</span>
      </span>
      <span className="shrink-0 text-right text-xs">
        {running ? (
          <>
            <span className="block font-semibold text-primary">Running… {formatElapsed(now - active.startedAt)}</span>
            <span className="block text-muted-foreground">Started {formatDayAge(active.startedAt)}</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-destructive">
            Failed · Try again
            <RotateCw className="size-3.5" />
          </span>
        )}
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
