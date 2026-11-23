"use client";

import { Button } from "@/components/ui/button";
import { useAnalysisHintsStore } from "@/stores/analysis-hints-store";

const STEPS = [
  "Left: what needs doing, most urgent first",
  "Pick one to see what is missing",
  "The blue button helps you fix it",
];

/** How to read a result, shown until the user dismisses it once (MS-1112). */
export function ResultsTip() {
  const dismissed = useAnalysisHintsStore((s) => s.resultsTipDismissed);
  const dismiss = useAnalysisHintsStore((s) => s.dismissResultsTip);
  if (dismissed) return null;

  return (
    <section
      aria-label="How to read this result"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-primary/20 bg-card px-4 py-3"
    >
      <h2 className="font-manrope text-[15px] font-extrabold text-foreground">How to read this result</h2>
      <ol className="contents">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2 text-sm text-foreground">
            <span
              aria-hidden="true"
              className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary/10 font-manrope text-xs font-extrabold text-primary"
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={dismiss}>
        Got it
      </Button>
    </section>
  );
}
