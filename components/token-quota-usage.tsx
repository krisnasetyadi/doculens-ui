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
      badge: "bg-[#fbecee] text-[#ad4c54] dark:bg-destructive/10 dark:text-red-400",
      card: "border-[#edc9cd] bg-[#fbecee]/50 dark:border-destructive/30 dark:bg-destructive/5",
    };
  }
  if (percent >= 80) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-[#fff4df] text-[#946528] dark:bg-amber-500/10 dark:text-amber-400",
      card: "border-[#ecd9b8] bg-[#fff4df]/50 dark:border-amber-500/30 dark:bg-amber-500/5",
    };
  }
  return {
    bar: "bg-primary",
    text: "text-muted-foreground",
    badge: "bg-[#eef1f6] text-muted-foreground dark:bg-muted",
    card: "border-border bg-card",
  };
}

/** The same server-calculated quota status in Settings > Usage and /usage.
 * `stack` is the original one-card list; `cards` lays the tiers out side by
 * side as small stat cards. */
export function TokenQuotaUsage({
  tiers,
  layout = "stack",
}: {
  tiers: TokenQuotaTierUsage[];
  layout?: "stack" | "cards";
}) {
  if (!tiers.length) return null;

  if (layout === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {tiers.map((tier) => {
          const percent = tier.token_limit > 0 ? Math.min(100, (tier.token_used / tier.token_limit) * 100) : 100;
          const tone = quotaTone(percent, tier.blocked);
          const resets = dayjs(tier.next_reset_date);
          return (
            <section
              key={tier.interval}
              aria-label={`${LABELS[tier.interval]} token usage`}
              className={`flex flex-col gap-3 rounded-[14px] border p-4 shadow-xs ${tone.card}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-['Manrope'] text-[13px] font-bold tracking-tight text-foreground">{LABELS[tier.interval]}</h3>
                <span className={`rounded-md px-[7px] py-1 font-['Manrope'] text-[10px] font-bold uppercase leading-none tracking-[0.06em] ${tone.badge}`}>
                  {tier.blocked ? "Limit" : `${Math.round(percent)}%`}
                </span>
              </div>
              <div>
                <p className="font-['Manrope'] text-2xl font-bold tabular-nums tracking-[-0.04em] text-foreground">
                  {tier.token_used.toLocaleString()}
                </p>
                <p className="mt-0.5 font-['Inter'] text-[11px] text-muted-foreground">
                  of {tier.token_limit.toLocaleString()} tokens
                </p>
              </div>
              <Progress
                value={percent}
                aria-label={`${LABELS[tier.interval]} token usage`}
                aria-valuenow={percent}
                aria-valuetext={`${tier.token_used.toLocaleString()} of ${tier.token_limit.toLocaleString()} tokens used`}
                className="h-1.5"
                indicatorClassName={tone.bar}
              />
              <div className="space-y-0.5 border-t border-border pt-3 font-['Inter'] text-[11px] text-muted-foreground">
                <p className="font-semibold">{tier.token_remaining.toLocaleString()} left</p>
                <p>
                  Resets{" "}
                  <time
                    dateTime={tier.next_reset_date}
                    title={resets.format("DD MMM YYYY, HH:mm:ss [UTC]Z")}
                  >
                    {resets.format("DD MMM, HH:mm")}
                  </time>
                </p>
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {tiers.map((tier) => {
        const percent = tier.token_limit > 0 ? Math.min(100, (tier.token_used / tier.token_limit) * 100) : 100;
        const tone = quotaTone(percent, tier.blocked);

        return (
          <section key={tier.interval} aria-label={`${LABELS[tier.interval]} token usage`} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-['Manrope'] text-[13px] font-bold tracking-tight text-foreground">{LABELS[tier.interval]}</h3>
              <span className={`rounded-md px-[7px] py-1 font-['Manrope'] text-[10px] font-bold uppercase leading-none tracking-[0.06em] ${tone.badge}`}>
                {tier.blocked ? "Limit reached" : `${Math.round(percent)}% used`}
              </span>
            </div>
            <p className="font-['Manrope'] text-2xl font-bold tabular-nums tracking-[-0.04em] text-foreground">
              {tier.token_used.toLocaleString()}{" "}
              <span className="text-xs font-normal tracking-normal text-muted-foreground">/ {tier.token_limit.toLocaleString()} tokens</span>
            </p>
            <Progress
              value={percent}
              aria-label={`${LABELS[tier.interval]} token usage`}
              aria-valuenow={percent}
              aria-valuetext={`${tier.token_used.toLocaleString()} of ${tier.token_limit.toLocaleString()} tokens used`}
              className="h-1.5"
              indicatorClassName={tone.bar}
            />
            <div className="space-y-1 font-['Inter'] text-[11px] text-muted-foreground">
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
