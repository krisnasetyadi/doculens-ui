"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalysisHintsStore } from "@/stores/analysis-hints-store";

/** How to read a result, in one line, shown until the user dismisses it once (MS-1112). */
export function ResultsTip() {
  const dismissed = useAnalysisHintsStore((s) => s.resultsTipDismissed);
  const dismiss = useAnalysisHintsStore((s) => s.dismissResultsTip);
  if (dismissed) return null;

  return (
    <aside
      aria-label="How to read this result"
      className="flex items-center gap-3 rounded-lg bg-primary/[0.05] px-4 py-2 text-sm text-foreground"
    >
      <Lightbulb aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <p className="flex-1">Most urgent first. Pick a requirement to see what&apos;s missing and how to fix it.</p>
      <Button variant="outline" size="sm" onClick={dismiss}>
        Got it
      </Button>
    </aside>
  );
}
