"use client";

import type { EfficiencyStats } from "@/services";

/** MS-247 "Efficient Mode" — per-message before/after popup. Same
 * hover-popover mechanics as SourceChip's item list (group/chip +
 * group-hover/chip:block), just showing a token comparison instead of a
 * source list. Only rendered when a message actually carries `efficiency`
 * data (i.e. the toggle was on when it was sent). */
interface EfficiencyBadgeProps {
  stats: EfficiencyStats;
}

export function EfficiencyBadge({ stats }: EfficiencyBadgeProps) {
  const tokensSaved = Math.max(0, stats.raw_tokens_est - stats.final_tokens_est);

  return (
    <div className="relative group/chip">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold font-['Manrope'] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        aria-label={`Efficient mode saved an estimated ${stats.reduction_pct}% of context tokens`}
      >
        <span className="material-symbols-outlined text-[11px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
          bolt
        </span>
        -{stats.reduction_pct}%
      </button>

      <div className="absolute bottom-full left-0 mb-2 hidden group-hover/chip:block group-focus-within/chip:block z-50 w-max max-w-[280px]">
        <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs font-['Inter'] space-y-1.5">
          <p className="font-bold font-['Manrope'] text-[11px] uppercase tracking-[0.2em] text-primary">
            Efficient Mode (est.)
          </p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Before</span>
            <span className="font-semibold">{stats.raw_tokens_est.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">After</span>
            <span className="font-semibold">{stats.final_tokens_est.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/60">
            <span className="text-muted-foreground">Saved</span>
            <span className="font-semibold text-primary">
              {tokensSaved.toLocaleString()} tokens ({stats.reduction_pct}%)
            </span>
          </div>
          {typeof stats.deduplicated_chunks === "number" && stats.deduplicated_chunks > 0 && (
            <p className="text-[10px] text-muted-foreground/70 pt-1">
              Dropped {stats.deduplicated_chunks} duplicate context chunk
              {stats.deduplicated_chunks === 1 ? "" : "s"}.
            </p>
          )}
          {typeof stats.sections_pruned === "number" && stats.sections_pruned > 0 && (
            <p className="text-[10px] text-muted-foreground/70">
              Trimmed low-relevance sections in {stats.sections_pruned} source
              {stats.sections_pruned === 1 ? "" : "s"}.
            </p>
          )}
          {typeof stats.memory_turns_deduplicated === "number" && stats.memory_turns_deduplicated > 0 && (
            <p className="text-[10px] text-muted-foreground/70">
              Removed {stats.memory_turns_deduplicated} repeated chat-history turn
              {stats.memory_turns_deduplicated === 1 ? "" : "s"}.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/50">
            Estimated (~4 chars/token), not an exact provider count.
          </p>
        </div>
      </div>
    </div>
  );
}
