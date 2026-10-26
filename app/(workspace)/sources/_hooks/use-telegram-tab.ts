import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useToast, errorToast } from "@/hooks/use-toast";
import { TelegramApi } from "@/services/resources/telegram-api";
import type {
  TelegramConnectionSource,
  TelegramConnectionsResponse,
  TelegramHistoryRange,
  TelegramSelectedChat,
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
  // Chats whose range was changed and not synced since. The server keeps the saved range but only a
  // sync rebuilds the stored messages, so the row says so until then (forgotten on reload).
  const [rangeChangedChats, setRangeChangedChats] = useState<Set<string>>(new Set());
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

  const updateTelegramChats = (
    connectionId: string,
    update: (chats: TelegramSelectedChat[]) => TelegramSelectedChat[],
  ) =>
    setTelegramConnections((prev) =>
      prev.map((c) => (c.connection_id === connectionId ? { ...c, selected_chats: update(c.selected_chats) } : c)),
    );

  /** Resolves to false when the removal failed (the toast is shown), so the confirm dialog stays open. */
  const removeTelegramChat = async (connectionId: string, chat: TelegramSelectedChat): Promise<boolean> => {
    try {
      await TelegramApi.removeChat<DeleteResponse>(connectionId, chat.dialog_id);
      updateTelegramChats(connectionId, (chats) => chats.filter((c) => c.dialog_id !== chat.dialog_id));
      toast({
        title: "Chat removed",
        description: `'${chat.title}' and its stored messages were deleted from DocuLens.`,
        variant: "success",
      });
      return true;
    } catch (err) {
      toast(errorToast("Couldn't remove the chat", err));
      return false;
    }
  };

  /** Shows the new range at once; if the server refuses it the chat goes back to its old range. Only
   * saves the setting, the next sync is what applies it. */
  const changeTelegramChatRange = (connectionId: string, dialogId: string, range: TelegramHistoryRange) => {
    const previous = telegramConnections
      .find((c) => c.connection_id === connectionId)
      ?.selected_chats.find((c) => c.dialog_id === dialogId)?.history_range;
    if (!previous || previous === range) return;

    const setRange = (value: TelegramHistoryRange) =>
      updateTelegramChats(connectionId, (chats) =>
        chats.map((c) => (c.dialog_id === dialogId ? { ...c, history_range: value } : c)),
      );
    const key = `${connectionId}:${dialogId}`;
    setRange(range);
    TelegramApi.setChatRange<TelegramSelectedChat>(connectionId, dialogId, { history_range: range })
      .then(() => {
        setRangeChangedChats((prev) => new Set(prev).add(key));
        toast({ title: "History range saved", description: "Sync this chat to apply it.", variant: "success" });
      })
      .catch((err) => {
        setRange(previous);
        toast(errorToast("Couldn't change the history range", err));
      });
  };

  /** Re-sync a selected chat (or a fresh batch from the connect dialog).
   * The backend rebuilds the same collection from the chat's saved history range. */
  const syncTelegramChats = (connectionId: string, dialogIds: string[]) => {
    const keys = dialogIds.map((d) => `${connectionId}:${d}`);
    setSyncingTelegramChats((prev) => new Set([...prev, ...keys]));
    TelegramApi.sync<TelegramSyncResponse>(connectionId, {
      dialog_ids: dialogIds,
    })
      .then((data) => {
        setRangeChangedChats((prev) => {
          const next = new Set(prev);
          data.results.filter((r) => r.status === "success").forEach((r) => next.delete(`${connectionId}:${r.dialog_id}`));
          return next;
        });
        const failed = data.results.filter((r) => r.status === "error");
        if (failed.length > 0) {
          toast({
            title: "Some chats didn't sync",
            // The reason is what tells the user to free space or pick another range.
            description: failed.map((f) => (f.error ? `${f.title}: ${f.error}` : f.title)).join(". "),
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
    rangeChangedChats,
    telegramDialogOpen,
    setTelegramDialogOpen,
    telegramDialogConnection,
    setTelegramDialogConnection,
    telegramAppConfigured,
    fetchTelegramConnections,
    toggleTelegramConnectionExpansion,
    toggleTelegramConnectionActive,
    deleteTelegramConnection,
    removeTelegramChat,
    changeTelegramChatRange,
    syncTelegramChats,
  };
}
