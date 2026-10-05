"use client";

import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsKeys } from "@/services/payments/handler/payments.keys";
import { paymentsQueries } from "@/services/payments/handler/payments.queries";
import type { MemberTokenUsage } from "@/services/payments/type/subscription.type";
import { useAuthStore } from "@/stores/auth-store";

const CAPPED_POLL_MS = 30_000;
// A floor keeps a client clock that runs ahead of the server from polling in a tight loop.
const MIN_RESET_DELAY_MS = 5_000;
// setTimeout's ceiling; beyond it the delay overflows and fires immediately.
const MAX_TIMER_DELAY_MS = 2_147_000_000;

export function isMemberCapped(usage: MemberTokenUsage | null): boolean {
  if (!usage) return false;
  return (
    (usage.quota_tiers ?? []).some((tier) => tier.blocked) ||
    (usage.allocated_tokens > 0 && usage.remaining_tokens <= 0)
  );
}

/** When to fetch again on its own: at the next rolling-quota reset, and every
 * 30s while capped if the caller wants to notice an admin raising the cap. */
function nextRefreshDelay(usage: MemberTokenUsage | null, pollWhileCapped: boolean): number | false {
  const delays: number[] = [];
  if (usage?.quota_tiers?.length) {
    const nextReset = Math.min(...usage.quota_tiers.map((tier) => dayjs(tier.next_reset_date).valueOf()));
    delays.push(Math.min(MAX_TIMER_DELAY_MS, Math.max(MIN_RESET_DELAY_MS, nextReset - Date.now() + 250)));
  }
  if (pollWhileCapped && isMemberCapped(usage)) delays.push(CAPPED_POLL_MS);
  return delays.length ? Math.min(...delays) : false;
}

interface UseMyUsageOptions {
  enabled?: boolean;
  pollWhileCapped?: boolean;
}

/** The signed-in member's token allocation (MS-248) and the plan-gated
 * features that come with the same response. One cache entry serves the chat
 * composer, Home, the /usage dialog, and Settings > Usage. */
export function useMyUsage({ enabled = true, pollWhileCapped = false }: UseMyUsageOptions = {}) {
  const userId = useAuthStore((state) => state.user?.user_id ?? null);
  const queryClient = useQueryClient();

  const query = useQuery({
    ...paymentsQueries.myUsage(userId),
    enabled: enabled && userId !== null,
    refetchInterval: (q) => nextRefreshDelay(q.state.data?.usage ?? null, pollWhileCapped),
  });

  return {
    usage: query.data?.usage ?? null,
    /** Hidden until the plan says otherwise, so Free users never see it flash in. */
    gapCheckAvailable: Boolean(query.data?.gap_check_available),
    isLoading: query.isLoading,
    isLoaded: query.isFetched,
    error: query.error,
    refresh: () => queryClient.invalidateQueries({ queryKey: paymentsKeys.myUsage() }),
  };
}
