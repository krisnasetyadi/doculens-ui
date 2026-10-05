import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { paymentsKeys } from "@/services/payments/handler/payments.keys";
import { paymentsQueries } from "@/services/payments/handler/payments.queries";
import { uploadLimitsFrom } from "@/lib/upload-limits";

/** Workspace storage for the signed-in user, shared by the Files-tab meter,
 * the upload checks and Settings > Storage so all of them show one number.
 * `usage` is null until the first response, or if the server can't be
 * reached; callers fall back to the default limits and hide the meter. A
 * failed refresh keeps the last good numbers and only flags `failed`. */
export function useStorageUsage() {
  const userId = useAuthStore((state) => state.user?.user_id ?? null);
  const queryClient = useQueryClient();
  const query = useQuery({ ...paymentsQueries.storageUsage(userId), enabled: userId !== null });

  const usage = query.data ?? null;
  return {
    usage,
    limits: uploadLimitsFrom(usage),
    loading: query.isFetching,
    failed: query.isError,
    refresh: () => queryClient.invalidateQueries({ queryKey: paymentsKeys.storageUsage() }),
  };
}
