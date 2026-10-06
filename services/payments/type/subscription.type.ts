export type SubscriptionStatus = "active" | "expired" | "none";

/** Workspace-level subscription + token usage for the current period.
 * Backend is the source of truth for every field here — the frontend
 * only renders them (MS-248). */
export interface SubscriptionUsage {
  plan_name: string;
  subscription_status: SubscriptionStatus;
  token_limit: number;
  token_used: number;
  token_remaining: number;
  period_start: string; // ISO date
  period_end: string; // ISO date
  next_reset_date: string | null;
  /** True once cancelled — access still runs until period_end (already
   * paid for), it just won't be treated as renewable after that. */
  cancel_at_period_end: boolean;
  /** False for the synthetic Free plan (nobody's paid) — hide cancel/resume
   * for it, there's no purchase on file to cancel. */
  is_paid: boolean;
}

export interface TokenQuotaTierUsage {
  interval: "daily" | "weekly" | "monthly";
  token_limit: number;
  token_used: number;
  token_remaining: number;
  period_start: string;
  next_reset_date: string;
  blocked: boolean;
}

/** One member's token allocation + consumption, carved out of the
 * workspace's SubscriptionUsage.token_limit by an admin. */
export interface MemberTokenUsage {
  user_id: string;
  email: string;
  allocated_tokens: number;
  used_tokens: number;
  remaining_tokens: number; // max(0, allocated_tokens - used_tokens)
  usage_percent: number; // used_tokens / allocated_tokens * 100 (0 if no allocation)
  /** True when no explicit cap was set and the workspace default applies (MS-402). */
  is_default_allocation: boolean;
  /** Present after an admin activates rolling quotas for this member. */
  quota_anchor_at?: string | null;
  quota_tiers?: TokenQuotaTierUsage[];
}

/** `null` when the workspace has no active subscription to allocate from. */
export interface MyMemberUsageResponse {
  usage: MemberTokenUsage | null;
  /** Whether the workspace plan includes Compliance Gap Check (not on Free). */
  gap_check_available?: boolean;
}

export interface MembersUsageResponse {
  subscription: SubscriptionUsage | null;
  members: MemberTokenUsage[];
  unallocated_tokens: number;
  /** Pool allocations are carved from and enforced against (MS-402) — the
   * Free quota once a paid plan has expired, not subscription.token_limit. */
  pool_token_limit: number;
  pool_plan_name: string | null;
}

export interface UpdateMemberAllocationRequest {
  user_id: string;
  allocated_tokens: number;
  daily_token_quota?: number;
  weekly_token_quota?: number;
}

export interface UpdateMemberAllocationResponse {
  member: MemberTokenUsage;
  unallocated_tokens: number;
}

/** Workspace "Default Token Allocation" new members get (MS-402). */
export interface WorkspaceTokenSettings {
  default_member_allocation: number;
}

/** Flat, plan-independent safety-net rate limit — same cap/window for every
 * user, separate from the per-member monthly allocation above. Sliding
 * window: `used_tokens` covers just the last `window_hours`, so it clears
 * gradually rather than on a fixed daily clock. `reset_at` is null unless
 * `blocked` is true. */
export interface RateLimitStatus {
  used_tokens: number;
  cap_tokens: number;
  window_hours: number;
  blocked: boolean;
  reset_at: string | null;
}
