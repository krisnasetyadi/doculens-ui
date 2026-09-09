"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EfficientModeApi } from "@/services/resources/efficient-mode-api";
import { useEfficientModeStore } from "@/stores/efficient-mode-store";
import type { EfficientModeStats } from "@/services/types";

/** MS-247 "Efficient Mode" mini-dashboard — Settings > Efficient Mode.
 * Same fetch-on-open convention as SkillsSettings (`active` prop gates the
 * request so it only fires while this tab/dialog is actually visible),
 * and the same stat-card visual language as the Usage tab right next to
 * it in this same modal. Self-contained: deleting this file + its one
 * `menuItems`/render-block wiring in settings-modal.tsx removes the whole
 * dashboard cleanly. */
export function EfficientModeSettings({ active }: { active: boolean }) {
  const enabled = useEfficientModeStore((s) => s.enabled);
  const toggle = useEfficientModeStore((s) => s.toggle);
  const [stats, setStats] = useState<EfficientModeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active) return;
    let ignore = false;
    setLoading(true);
    setError(null);
    EfficientModeApi.getMyStats<EfficientModeStats>()
      .then((data) => { if (!ignore) setStats(data); })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Could not load Efficient Mode stats.");
      })
      .finally(() => { if (!ignore) { setLoading(false); setLoaded(true); } });
    return () => { ignore = true; };
  }, [active]);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Efficient Mode</h2>
          <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">
            Experimental, caveman-inspired context compression — see whether it actually
            shrinks tokens for your questions.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          <p className="font-['Manrope'] text-sm font-bold text-foreground">Enable in chat</p>
          <p className="text-xs text-muted-foreground font-['Inter']">
            Same toggle as the &quot;Efficient&quot; chip in the chat composer.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} aria-label="Toggle Efficient Mode" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground font-['Inter'] flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
        </p>
      ) : error ? (
        <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      ) : stats && stats.queries_tested > 0 ? (
        <div className="rounded-xl border border-border/60 p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-['Manrope'] text-2xl font-extrabold text-foreground">
              {stats.avg_reduction_pct}%{" "}
              <span className="text-sm font-normal text-muted-foreground">avg. token reduction</span>
            </span>
            <span className="font-['Manrope'] text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-full">
              {stats.queries_tested} tested
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-['Inter']">
            <span className="text-muted-foreground">Estimated tokens saved</span>
            <span className="font-semibold text-foreground">
              {stats.total_tokens_saved_est.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-['Inter'] text-muted-foreground">
            <span>Before</span>
            <span>{stats.total_raw_tokens_est.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center justify-between text-xs font-['Inter'] text-muted-foreground">
            <span>After</span>
            <span>{stats.total_final_tokens_est.toLocaleString()} tokens</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60 pt-1">
            Estimated locally (~4 chars/token), not an exact provider token count. Only
            counts questions sent with Efficient Mode on.
          </p>
        </div>
      ) : loaded ? (
        <p className="text-sm text-muted-foreground font-['Inter']">
          No questions tested with Efficient Mode on yet — toggle it on above (or the
          &quot;Efficient&quot; chip in chat) and ask something to see a comparison here.
        </p>
      ) : null}
    </div>
  );
}
