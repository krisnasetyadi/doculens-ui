import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useToast, errorToast } from "@/hooks/use-toast";
import { TelegramApi } from "@/services/resources/telegram-api";
import type {
  TelegramConnectionSource,
  TelegramConnectionsResponse,
  TelegramSyncResponse,
  DeleteResponse,
} from "@/services";
import type { SortState } from "../_types/sources.type";

export function useTelegramTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();

  const [telegramConnections, setTelegramConnections] = useState<TelegramConnectionSource[]>([]);
  // Loading from the first frame for an admin (the fetch below runs after the first paint), so the
  // empty state does not flash before the skeleton. A member never fetches Telegram.
  const [loadingTelegramConnections, setLoadingTelegramConnections] = useState(isAdmin);
  const [expandedTelegramConnections, setExpandedTelegramConnections] = useState<Set<string>>(new Set());
  const [syncingTelegramChats, setSyncingTelegramChats] = useState<Set<string>>(new Set());
  const [telegramSort, setTelegramSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramDialogConnection, setTelegramDialogConnection] = useState<TelegramConnectionSource | null>(null);
  // Assumed set up until the list says otherwise, so the dialog never blocks on a list that failed.
  const [telegramAppConfigured, setTelegramAppConfigured] = useState(true);

  const fetchTelegramConnections = () => {
    setLoadingTelegramConnections(true);
    TelegramApi.list<TelegramConnectionsResponse>()
      .then((data) => {
        setTelegramConnections(data.connections);
        setTelegramAppConfigured(data.app_configured !== false);
      })
      .catch(() =>
        toast({
          title: "Couldn't load Telegram connections",
          description: "Check your connection and try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingTelegramConnections(false));
  };

  useEffect(() => {
    // Telegram is an admin-only source — fetching it for everyone else just
    // trips the backend's role check and surfaces confusing error toasts.
    if (isAdmin) {
      fetchTelegramConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const toggleTelegramConnectionExpansion = (id: string) => {
    setExpandedTelegramConnections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /** Flips the switch at once; if the request fails the connection goes back to its old status. */
  const toggleTelegramConnectionActive = (id: string, active: boolean) => {
    const setStatus = (isActive: boolean) =>
      setTelegramConnections((prev) =>
        prev.map((c) => (c.connection_id === id ? { ...c, status: isActive ? "active" : "inactive" } : c)),
      );

    setStatus(active);
    TelegramApi.activate<{ status: string }>({ connection_id: id, active }).catch(() => {
      setStatus(!active);
      toast({ title: "Failed to update active status", variant: "destructive" });
    });
  };

  /** Resolves to false when the delete failed (the toast is shown), so the confirm dialog stays open. */
  const deleteTelegramConnection = async (id: string): Promise<boolean> => {
    try {
      await TelegramApi.delete<DeleteResponse>(id);
      setTelegramConnections((prev) => prev.filter((c) => c.connection_id !== id));
      toast({
        title: "Telegram connection removed",
        description: "DocuLens was logged out of the account and its synced chats were deleted.",
        variant: "success",
      });
      return true;
    } catch (err) {
      // The server says why, e.g. that a chat could not be deleted and the connection was kept.
      toast(errorToast("Couldn't delete the connection", err));
      return false;
    }
  };

  /** Re-sync a selected chat (or a fresh batch from the connect dialog).
   * The backend rebuilds the same collection from the available history. */
  const syncTelegramChats = (connectionId: string, dialogIds: string[]) => {
    const keys = dialogIds.map((d) => `${connectionId}:${d}`);
    setSyncingTelegramChats((prev) => new Set([...prev, ...keys]));
    TelegramApi.sync<TelegramSyncResponse>(connectionId, {
      dialog_ids: dialogIds,
    })
      .then((data) => {
        const failed = data.results.filter((r) => r.status === "error");
        if (failed.length > 0) {
          toast({
            title: "Some chats didn't sync",
            description: failed.map((f) => f.title).join(", "),
            variant: "destructive",
          });
        } else {
          toast({ title: "Synced", description: `${data.results.length} chat(s) up to date.`, variant: "success" });
        }
        fetchTelegramConnections();
      })
      .catch((err) =>
        toast(errorToast("Couldn't sync the chats", err)),
      )
      .finally(() => {
        setSyncingTelegramChats((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
      });
  };

  const sortedTelegramConnections = [...telegramConnections].sort((a, b) => {
    const direction = telegramSort.dir === "asc" ? 1 : -1;
    if (telegramSort.key === "name") return direction * a.label.localeCompare(b.label);
    return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
  });

  return {
    telegramConnections,
    sortedTelegramConnections,
    telegramSort,
    setTelegramSort,
    loadingTelegramConnections,
    expandedTelegramConnections,
    syncingTelegramChats,
    telegramDialogOpen,
    setTelegramDialogOpen,
    telegramDialogConnection,
    setTelegramDialogConnection,
    telegramAppConfigured,
    fetchTelegramConnections,
    toggleTelegramConnectionExpansion,
    toggleTelegramConnectionActive,
    deleteTelegramConnection,
    syncTelegramChats,
  };
}
