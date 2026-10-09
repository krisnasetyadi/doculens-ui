"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  CARD_CLASS,
  FIGURE_CLASS,
  FIGURE_UNIT_CLASS,
  SettingRow,
  SettingsGroup,
  SettingsHeader,
  SettingsSection,
} from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import { EfficientModeApi } from "@/services/resources/efficient-mode-api";
import { useEfficientModeStore } from "@/stores/efficient-mode-store";
import type { EfficientModeStats } from "@/services/types";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/notice";

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

  // Zero tested questions is the empty message below, not a card of zeros.
  const shown = stats && stats.queries_tested > 0 ? stats : null;

  return (
    <div className="max-w-2xl space-y-8">
      <SettingsHeader
        icon={Zap}
        title="Efficient Mode"
        description={<>Experimental, caveman-inspired context compression — see whether it actually shrinks tokens for your questions.</>}
      />

      <SettingsSection title="In chat">
        <SettingsGroup>
          <SettingRow
            inline
            title="Enable in chat"
            description={<>Same toggle as the &quot;Efficient&quot; chip in the chat composer.</>}
          >
            <Switch
              checked={enabled}
              onCheckedChange={toggle}
              aria-label="Toggle Efficient Mode"
              className="relative max-sm:after:absolute max-sm:after:-inset-x-1 max-sm:after:-inset-y-[11px] max-sm:after:content-['']"
            />
          </SettingRow>
        </SettingsGroup>
      </SettingsSection>

      {error && !loading ? (
        <Notice tone="error">{error}</Notice>
      ) : shown || (loading && !stats) ? (
        // One card for loading and loaded: the labels and the footnote never wait for data, so only
        // the numbers swap from a placeholder to a value and nothing moves when the stats arrive.
        <div className={cn(CARD_CLASS, "space-y-3")} role={shown ? undefined : "status"} aria-busy={!shown}>
          {!shown && <span className="sr-only">Loading stats…</span>}
          <div className="flex items-baseline justify-between">
            <span className={FIGURE_CLASS}>
              {shown ? `${shown.avg_reduction_pct}%` : <Skeleton className="inline-block h-[17px] w-14 align-baseline" />}{" "}
              <span className={FIGURE_UNIT_CLASS}>avg. token reduction</span>
            </span>
            {shown ? (
              <Badge variant="secondary">
                {shown.queries_tested} tested
              </Badge>
            ) : (
              <Skeleton className="h-[18px] w-[68px]" />
            )}
          </div>
          <div className="flex items-center justify-between font-inter text-xs">
            <span className="text-muted-foreground">Estimated tokens saved</span>
            {shown ? (
              <span className="font-semibold text-foreground">
                {shown.total_tokens_saved_est.toLocaleString()}
              </span>
            ) : (
              <Skeleton className="h-2.5 w-16" />
            )}
          </div>
          <div className="flex items-center justify-between font-inter text-[11px] text-muted-foreground">
            <span>Before</span>
            {shown ? <span>{shown.total_raw_tokens_est.toLocaleString()} tokens</span> : <Skeleton className="h-[7px] w-20" />}
          </div>
          <div className="flex items-center justify-between font-inter text-[11px] text-muted-foreground">
            <span>After</span>
            {shown ? <span>{shown.total_final_tokens_est.toLocaleString()} tokens</span> : <Skeleton className="h-[7px] w-20" />}
          </div>
          <p className="border-t border-border pt-3 text-[11px] leading-4 text-muted-foreground">
            Estimated locally (~4 chars/token), not an exact provider token count. Only
            counts questions sent with Efficient Mode on.
          </p>
        </div>
      ) : loaded ? (
        <p className="font-inter text-xs text-muted-foreground">
          No questions tested with Efficient Mode on yet — toggle it on above (or the
          &quot;Efficient&quot; chip in chat) and ask something to see a comparison here.
        </p>
      ) : null}
    </div>
  );
}
