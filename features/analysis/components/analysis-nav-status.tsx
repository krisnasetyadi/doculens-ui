"use client";

import { Lock } from "lucide-react";
import { useMyUsage } from "@/features/billing/hooks/use-my-usage";
import { useAnalysisRunStore } from "@/stores/analysis-run-store";
import { cn } from "@/lib/utils";

/**
 * What the Analysis menu item says about the feature (MS-916): a pulsing dot while an analysis is
 * running, wherever the user is, and a Pro tag on plans without it, so Free users can tell the page
 * leads to an upgrade. `compact` is the dot alone, for the phone's bottom tab bar.
 */
export function AnalysisNavStatus({ compact = false, className }: { compact?: boolean; className?: string }) {
  const running = useAnalysisRunStore((s) => s.active?.status === "running");
  const { gapCheckAvailable, isLoaded, error } = useMyUsage();

  if (running) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
        <span className="sr-only">An analysis is running</span>
      </span>
    );
  }
  // No tag when the plan couldn't be read: a Team user must not be told the page is locked.
  if (compact || !isLoaded || error || gapCheckAvailable) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      <Lock aria-hidden="true" className="size-2.5" />
      Pro
    </span>
  );
}
