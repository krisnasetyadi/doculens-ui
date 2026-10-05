import { create } from "zustand";
import { paymentsApi } from "@/services/payments/handler/payments.api";
import { useAuthStore } from "@/stores/auth-store";
import type { StorageUsage } from "@/services/payments/type/storage.type";

interface StorageState {
  usage: StorageUsage | null;
  /** The user `usage` was read for, so a different user signing in on the
   * same page never sees the previous one's numbers. */
  ownerId: string | null;
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
}

let inflight: Promise<void> | null = null;

/** Workspace storage usage, shared by the Files-tab meter, the upload checks
 * and Settings > Storage so all of them show one number. */
export const useStorageStore = create<StorageState>((set) => ({
  usage: null,
  ownerId: null,
  loading: false,
  failed: false,
  refresh: () => {
    // Several callers can ask at once (a finished upload, a delete, a tab
    // opening); they all get the one request already in flight.
    if (inflight) return inflight;
    const ownerId = useAuthStore.getState().user?.user_id ?? null;
    set({ loading: true });
    inflight = paymentsApi.getStorageUsage()
      .then((usage) => set({ usage, ownerId, failed: false }))
      // Keep the last good numbers on a failed refresh; only flag it.
      .catch(() => set({ failed: true }))
      .finally(() => {
        inflight = null;
        set({ loading: false });
      });
    return inflight;
  },
}));

/** The usage that belongs to the signed-in user, or null. */
export function currentStorageUsage(): StorageUsage | null {
  const { usage, ownerId } = useStorageStore.getState();
  const userId = useAuthStore.getState().user?.user_id ?? null;
  return usage && ownerId === userId ? usage : null;
}
