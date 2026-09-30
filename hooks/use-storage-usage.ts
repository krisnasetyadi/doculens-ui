import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useStorageStore } from "@/stores/storage-store";
import { uploadLimitsFrom } from "@/lib/upload-limits";

/** Workspace storage for the signed-in user, refreshed when the component
 * mounts. `usage` is null until the first response, or if the server can't be
 * reached; callers fall back to the default limits and hide the meter. */
export function useStorageUsage() {
  const userId = useAuthStore((state) => state.user?.user_id ?? null);
  const usage = useStorageStore((state) => state.usage);
  const ownerId = useStorageStore((state) => state.ownerId);
  const loading = useStorageStore((state) => state.loading);
  const failed = useStorageStore((state) => state.failed);
  const refresh = useStorageStore((state) => state.refresh);

  useEffect(() => {
    void refresh();
  }, [userId, refresh]);

  const current = usage && ownerId === userId ? usage : null;
  return { usage: current, limits: uploadLimitsFrom(current), loading, failed, refresh };
}
