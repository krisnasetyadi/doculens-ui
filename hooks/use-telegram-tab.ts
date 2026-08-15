import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TelegramApi } from "@/services/resources/telegram-api";
import type {
  TelegramConnectionSource,
  TelegramConnectionsResponse,
  TelegramSyncResponse,
  DeleteResponse,
} from "@/services";

export function useTelegramTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();

  const [telegramConnections, setTelegramConnections] = useState<TelegramConnectionSource[]>([]);
  const [loadingTelegramConnections, setLoadingTelegramConnections] = useState(false);
  const [expandedTelegramConnections, setExpandedTelegramConnections] = useState<Set<string>>(new Set());
  const [syncingTelegramChats, setSyncingTelegramChats] = useState<Set<string>>(new Set());
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramDialogConnection, setTelegramDialogConnection] = useState<TelegramConnectionSource | null>(null);

  const fetchTelegramConnections = () => {
    setLoadingTelegramConnections(true);
    TelegramApi.list<TelegramConnectionsResponse>()
      .then((data) => setTelegramConnections(data.connections))
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to load Telegram connections",
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

  const toggleTelegramConnectionActive = (id: string, active: boolean) => {
    TelegramApi.activate<{ status: string }>({ connection_id: id, active })
      .then(() => {
        setTelegramConnections((prev) =>
          prev.map((c) => (c.connection_id === id ? { ...c, status: active ? "active" : "inactive" } : c)),
        );
      })
      .catch(() => toast({ title: "Failed to update active status", variant: "destructive" }));
  };

  const deleteTelegramConnection = (id: string) => {
    TelegramApi.delete<DeleteResponse>(id)
      .then(() => {
        setTelegramConnections((prev) => prev.filter((c) => c.connection_id !== id));
        toast({ title: "Telegram connection removed", description: "Already-synced chats stay searchable.", variant: "success" });
      })
      .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
  };

  /** Re-sync a single already-selected chat (or a fresh batch from the
   * connect dialog) — safe to hit repeatedly, it just pulls the latest
   * messages into the same chat_collection rather than duplicating it. */
  const syncTelegramChats = (connectionId: string, dialogIds: string[]) => {
    const keys = dialogIds.map((d) => `${connectionId}:${d}`);
    setSyncingTelegramChats((prev) => new Set([...prev, ...keys]));
    TelegramApi.sync<TelegramSyncResponse>(connectionId, {
      dialog_ids: dialogIds,
      message_limit: 2000,
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
        toast({
          title: "Sync failed",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        setSyncingTelegramChats((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
      });
  };

  return {
    telegramConnections,
    loadingTelegramConnections,
    expandedTelegramConnections,
    syncingTelegramChats,
    telegramDialogOpen,
    setTelegramDialogOpen,
    telegramDialogConnection,
    setTelegramDialogConnection,
    fetchTelegramConnections,
    toggleTelegramConnectionExpansion,
    toggleTelegramConnectionActive,
    deleteTelegramConnection,
    syncTelegramChats,
  };
}
