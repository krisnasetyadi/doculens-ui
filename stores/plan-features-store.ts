import { create } from "zustand";
import { paymentsApi } from "@/services/payments/handler/payments.api";
import type { MyMemberUsageResponse } from "@/services/payments/type/subscription.type";

/** Plan-gated features the UI should hide rather than let the user hit a
 * backend 403 for. Fed by GET /payments/subscription/me — the same call
 * use-chat-thread already makes for the member token cap, which applies its
 * response here via applyUsageResponse instead of fetching twice.
 *
 * Defaults to hidden: a Free user never sees Gap Check flash in and out,
 * and a paid user only waits one request for it to appear. The backend
 * gate (enforce_gap_check_plan) stays the source of truth either way. */
interface PlanFeaturesState {
  gapCheckAvailable: boolean;
  applyUsageResponse: (res: MyMemberUsageResponse) => void;
  refresh: () => void;
}

let inFlight: Promise<void> | null = null;

export const usePlanFeaturesStore = create<PlanFeaturesState>()((set, get) => ({
  gapCheckAvailable: false,
  applyUsageResponse: (res) => set({ gapCheckAvailable: Boolean(res.gap_check_available) }),
  refresh: () => {
    if (inFlight) return;
    inFlight = paymentsApi.getMyUsage()
      .then((res) => get().applyUsageResponse(res))
      // Leave the previous value in place — hidden by default, so a failed
      // fetch never exposes a feature the plan may not include.
      .catch(() => {})
      .finally(() => {
        inFlight = null;
      });
  },
}));
