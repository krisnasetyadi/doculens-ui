import dayjs from "dayjs";
import { Progress } from "@/components/ui/progress";
import type { TokenQuotaTierUsage } from "@/services/payments/type/subscription.type";

const LABELS: Record<TokenQuotaTierUsage["interval"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** One severity scale for every quota view, matching the allocation bar:
 * primary below 80%, amber from 80%, destructive once the limit is hit. */
export function quotaTone(percent: number, blocked: boolean) {
  if (blocked) {
    return {
      bar: "bg-destructive",
      text: "text-destructive",
      badge: "bg-destructive/10 text-destructive",
      card: "border-destructive/30 bg-destructive/5",
    };
  }
  if (percent >= 80) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      card: "border-amber-500/30 bg-amber-500/5",
    };
  }
  return {
    bar: "bg-primary",
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    card: "border-border/60 bg-muted/20",
  };
}

/** The same server-calculated quota status in Settings > Usage and /usage. */
export function TokenQuotaUsage({ tiers }: { tiers: TokenQuotaTierUsage[] }) {
  if (!tiers.length) return null;

  return (
    <div className="divide-y divide-border/60">
      {tiers.map((tier) => {
        const percent = tier.token_limit > 0 ? Math.min(100, (tier.token_used / tier.token_limit) * 100) : 100;
        const tone = quotaTone(percent, tier.blocked);

        return (
          <section key={tier.interval} aria-label={`${LABELS[tier.interval]} token usage`} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-['Manrope'] text-sm font-extrabold text-foreground">{LABELS[tier.interval]}</h3>
              <span className={`rounded-full px-2.5 py-1 font-['Manrope'] text-[11px] font-bold ${tone.badge}`}>
                {tier.blocked ? "Limit reached" : `${Math.round(percent)}% used`}
              </span>
            </div>
            <p className="font-['Manrope'] text-xl font-extrabold tabular-nums text-foreground">
              {tier.token_used.toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">/ {tier.token_limit.toLocaleString()} tokens</span>
            </p>
            <Progress
              value={percent}
              aria-label={`${LABELS[tier.interval]} token usage`}
              aria-valuenow={percent}
              aria-valuetext={`${tier.token_used.toLocaleString()} of ${tier.token_limit.toLocaleString()} tokens used`}
              className="h-1.5"
              indicatorClassName={tone.bar}
            />
            <div className="space-y-1 font-['Inter'] text-xs text-muted-foreground">
              <p>{tier.token_remaining.toLocaleString()} tokens remaining</p>
              <p className="flex flex-wrap gap-x-1">
                <span>Resets</span>
                <time dateTime={tier.next_reset_date} className="text-foreground">
                  {dayjs(tier.next_reset_date).format("DD MMM YYYY, HH:mm:ss [UTC]Z")}
                </time>
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
