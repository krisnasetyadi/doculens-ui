"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { TokenQuotaUsage } from "@/components/token-quota-usage";
import { formatResetTime, formatDurationHours } from "@/lib/date";
import { useMyUsage } from "@/features/billing/hooks/use-my-usage";
import { useAuthStore } from "@/stores/auth-store";
import type { RateLimitStatus } from "@/services/payments/type/subscription.type";
import { AlertCircle, Gauge, Timer } from "lucide-react";
import { UsageCardSkeleton } from "./usage-card-skeleton";

interface UsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shared with the chat composer's own banner via useChatThread, so
   * clicking "Request more tokens" here or there reflects the same
   * in-flight/sent state instead of each surface tracking it separately. */
  rateLimit: RateLimitStatus | null;
  onRequestMoreTokens: () => void;
  requestingMoreTokens: boolean;
  tokenRequestSent: boolean;
}

/** "/usage" slash command popup — same data source and card markup as the
 * Settings > Usage tab (settings-modal.tsx), just in a lightweight dialog
 * so it's reachable straight from the chat composer (MS-248 follow-up). */
export function UsageDialog({
  open,
  onOpenChange,
  rateLimit,
  onRequestMoreTokens,
  requestingMoreTokens,
  tokenRequestSent,
}: UsageDialogProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const { usage, isLoading: loading, isLoaded: loaded, error: usageError } = useMyUsage({ enabled: open });
  const error = usageError ? usageError.message || "Failed to load usage." : null;

  const isCapped = Boolean(usage && usage.allocated_tokens > 0 && usage.remaining_tokens <= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-['Manrope']">
            <Gauge className="h-4 w-4 text-primary" />
            Token Usage
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <UsageCardSkeleton />
        ) : error ? (
          <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        ) : usage ? (
          <div className="rounded-xl border border-border/60 p-5 space-y-3">
            {usage.quota_tiers?.length ? (
              <TokenQuotaUsage tiers={usage.quota_tiers} />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-['Manrope'] text-2xl font-extrabold text-foreground">
                    {usage.used_tokens.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {usage.allocated_tokens.toLocaleString()} tokens
                    </span>
                  </span>
                  <span className="font-['Manrope'] text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-full">
                    {usage.allocated_tokens > 0 ? `${Math.round(usage.usage_percent)}%` : "—"}
                  </span>
                </div>
                <Progress value={usage.allocated_tokens > 0 ? Math.min(100, usage.usage_percent) : 0} />
                <p className="text-xs text-muted-foreground font-['Inter']">
                  {usage.allocated_tokens > 0
                    ? `${Math.max(0, usage.remaining_tokens).toLocaleString()} tokens remaining`
                    : isAdmin
                      ? "No token cap set for your own account yet — set one in Settings > Billing if you want one."
                      : "No token allocation set for your account yet — ask your workspace admin."}
                </p>
              </>
            )}
            {isCapped && !isAdmin && (
              <button
                type="button"
                onClick={onRequestMoreTokens}
                disabled={requestingMoreTokens || tokenRequestSent}
                className="w-full text-center text-xs font-['Manrope'] font-bold rounded-lg py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 disabled:opacity-70"
              >
                {tokenRequestSent
                  ? "Request sent to admin ✓"
                  : requestingMoreTokens
                    ? "Sending…"
                    : "Request more tokens"}
              </button>
            )}
          </div>
        ) : loaded ? (
          <p className="text-sm text-muted-foreground font-['Inter']">
            Your workspace doesn&apos;t have an active DocuLens subscription yet.
          </p>
        ) : null}

        {rateLimit && (
          <div
            className={`rounded-xl border p-3 space-y-1.5 ${
              rateLimit.blocked
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-border/60"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-['Manrope'] font-bold text-foreground">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              Rate limit ({formatDurationHours(rateLimit.window_hours)} window)
            </div>
            <p className="text-xs text-muted-foreground font-['Inter']">
              {rateLimit.used_tokens.toLocaleString()} / {rateLimit.cap_tokens.toLocaleString()} tokens
              {rateLimit.blocked && rateLimit.reset_at && (
                <> — batas tercapai, coba lagi sekitar {formatResetTime(rateLimit.reset_at)}</>
              )}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
