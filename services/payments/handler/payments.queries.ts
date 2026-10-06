import { queryOptions } from "@tanstack/react-query";
import { paymentsApi } from "./payments.api";
import { paymentsKeys } from "./payments.keys";

// Keyed by user so a different user signing in on the same tab never reads
// the previous user's numbers from the cache.
export const paymentsQueries = {
  myUsage: (userId: string | null) =>
    queryOptions({
      queryKey: paymentsKeys.myUsageOf(userId),
      queryFn: paymentsApi.getMyUsage,
    }),

  storageUsage: (userId: string | null) =>
    queryOptions({
      queryKey: paymentsKeys.storageUsageOf(userId),
      queryFn: paymentsApi.getStorageUsage,
    }),
};
