import { ENDPOINT } from "@/services/endpoint";

export const PAYMENTS_ENDPOINT = {
  BASE: ENDPOINT.PAYMENTS,
  CHECKOUT_SESSION: "checkout-session",
  SESSION: "session",
  SUBSCRIPTION_ME: "subscription/me",
  SUBSCRIPTION_MEMBERS: "subscription/members",
  SUBSCRIPTION_ALLOCATIONS: "subscription/allocations",
  SUBSCRIPTION_SETTINGS: "subscription/settings",
  SUBSCRIPTION_CANCEL: "subscription/cancel",
  SUBSCRIPTION_RESUME: "subscription/resume",
  SUBSCRIPTION_REQUEST_MORE: "subscription/request-more",
  SUBSCRIPTION_REQUESTS: "subscription/requests",
  DISMISS: "dismiss",
  STORAGE_USAGE: "storage/usage",
  RATE_LIMIT_ME: "rate-limit/me",
} as const;
