export const paymentsKeys = {
  all: ["payments"] as const,
  myUsage: () => [...paymentsKeys.all, "my-usage"] as const,
  myUsageOf: (userId: string | null) => [...paymentsKeys.myUsage(), userId] as const,
  storageUsage: () => [...paymentsKeys.all, "storage-usage"] as const,
  storageUsageOf: (userId: string | null) => [...paymentsKeys.storageUsage(), userId] as const,
};
