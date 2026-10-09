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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/panel";
import { Notice } from "@/components/notice";
import { panelVariants } from "@/components/panel";
import { cn } from "@/lib/utils";

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
          <DialogTitle className="flex items-center gap-2 font-manrope">
            <Gauge className="h-4 w-4 text-primary" />
            Token Usage
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <UsageCardSkeleton />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : usage ? (
          <Panel padding="lg" className="space-y-3">
            {usage.quota_tiers?.length ? (
              <TokenQuotaUsage tiers={usage.quota_tiers} />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-manrope text-2xl font-extrabold text-foreground">
                    {usage.used_tokens.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {usage.allocated_tokens.toLocaleString()} tokens
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {usage.allocated_tokens > 0 ? `${Math.round(usage.usage_percent)}%` : "—"}
                  </Badge>
                </div>
                <Progress value={usage.allocated_tokens > 0 ? Math.min(100, usage.usage_percent) : 0} />
                <p className="text-xs text-muted-foreground font-inter">
                  {usage.allocated_tokens > 0
                    ? `${Math.max(0, usage.remaining_tokens).toLocaleString()} tokens remaining`
                    : isAdmin
                      ? "No token cap set for your own account yet — set one in Settings > Billing if you want one."
                      : "No token allocation set for your account yet — ask your workspace admin."}
                </p>
              </>
            )}
            {isCapped && !isAdmin && (
              <Button
                type="button"
                variant="outline"
                onClick={onRequestMoreTokens}
                disabled={requestingMoreTokens || tokenRequestSent}
                className="w-full"
              >
                {tokenRequestSent
                  ? "Request sent to admin ✓"
                  : requestingMoreTokens
                    ? "Sending…"
                    : "Request more tokens"}
              </Button>
            )}
          </Panel>
        ) : loaded ? (
          <p className="text-sm text-muted-foreground font-inter">
            Your workspace doesn&apos;t have an active DocuLens subscription yet.
          </p>
        ) : null}

        {rateLimit && (
          <div
            className={cn(
              panelVariants({ padding: "sm" }),
              "space-y-1.5",
              rateLimit.blocked && "border-warning/30 bg-warning-soft",
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-manrope font-bold text-foreground">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              Rate limit ({formatDurationHours(rateLimit.window_hours)} window)
            </div>
            <p className="text-xs text-muted-foreground font-inter">
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
