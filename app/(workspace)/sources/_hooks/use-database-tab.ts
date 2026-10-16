import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast, errorToast } from "@/hooks/use-toast";
import { ApiError } from "@/services/api-error";
import {
  databaseConnectionsMutations,
  databaseConnectionsQueries,
} from "@/services/database-connections/handler/database-connections.queries";
import type { SortState } from "../_types/sources.type";
import type { DatabaseConnectionValues } from "../_lib/source-forms";

const toggleInSet = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/** The server's 400 for a connection URL, in the UI's language. It sends two of them in Indonesian. */
function dbUrlMessage(serverMessage: string) {
  if (serverMessage.startsWith("URL harus diawali")) return "Enter a URL that starts with postgresql:// or postgres://";
  if (serverMessage.startsWith("URL koneksi tidak valid")) return "Enter a valid connection URL";
  return "Check the host, port, user, and password in this URL";
}

export function useDatabaseTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();

  // Database is an admin-only source — fetching it for everyone else just
  // trips the backend's role check and surfaces confusing error toasts.
  const connectionsQuery = useQuery({ ...databaseConnectionsQueries.list(), enabled: isAdmin });
  const createConnection = useMutation(databaseConnectionsMutations.create());
  const refreshTables = useMutation(databaseConnectionsMutations.refreshTables());
  const activateConnection = useMutation(databaseConnectionsMutations.activate());
  const deleteConnection = useMutation(databaseConnectionsMutations.delete());

  const [expandedDbConnections, setExpandedDbConnections] = useState<Set<string>>(new Set());
  const [loadingTablesFor, setLoadingTablesFor] = useState<Set<string>>(new Set());
  const [dbTableErrors, setDbTableErrors] = useState<Record<string, string>>({});
  const [dbSort, setDbSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [revealedConnUrls, setRevealedConnUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!connectionsQuery.isError) return;
    toast({
      title: "Couldn't load database connections",
      description: "Check your connection and try again.",
      variant: "destructive",
    });
  }, [connectionsQuery.isError, toast]);

  const toggleConnUrlReveal = (id: string) => setRevealedConnUrls((prev) => toggleInSet(prev, id));
  const toggleTable = (name: string) => setExpandedTables((prev) => toggleInSet(prev, name));

  /** Resolves to a message for the URL field when the server refused what was typed, otherwise null
   * (connected and closed, or a toast was shown and the dialog stays open as it was). */
  const connectDatabase = async (values: DatabaseConnectionValues): Promise<string | null> => {
    try {
      const created = await createConnection.mutateAsync({
        label: values.label || undefined,
        url: values.url,
      });
      setExpandedDbConnections((prev) => new Set(prev).add(created.connection_id));
      setDbDialogOpen(false);
      toast({ title: "Database connected", description: `${created.table_count} table(s) found.`, variant: "success" });
      return null;
    } catch (err) {
      // The server refusing the URL itself (400) is about what the user typed, so it goes under the
      // URL field. A server or network failure is a toast.
      if (err instanceof ApiError && err.status === 400) return dbUrlMessage(err.message);
      toast(errorToast("Couldn't connect the database", err, "Check your connection and try again."));
      return null;
    }
  };

  // Tracked per connection: several can be expanded (and loading) at once.
  const refreshConnectionTables = async (id: string) => {
    setLoadingTablesFor((prev) => new Set(prev).add(id));
    setDbTableErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      await refreshTables.mutateAsync(id);
    } catch {
      setDbTableErrors((prev) => ({ ...prev, [id]: "Failed to load tables" }));
    } finally {
      setLoadingTablesFor((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleDbConnectionExpansion = (id: string) => {
    const expanding = !expandedDbConnections.has(id);
    setExpandedDbConnections((prev) => toggleInSet(prev, id));
    // Lazily fetch tables the first time a connection is expanded.
    if (expanding) void refreshConnectionTables(id);
  };

  const toggleDbConnectionActive = (id: string, active: boolean) => {
    activateConnection.mutate(
      { connection_id: id, active },
      { onError: () => toast({ title: "Failed to update active status", variant: "destructive" }) },
    );
  };

  /** Resolves to false when the delete failed (the toast is shown), so the confirm dialog stays open. */
  const deleteDbConnection = async (id: string): Promise<boolean> => {
    try {
      await deleteConnection.mutateAsync(id);
      toast({ title: "Connection deleted", variant: "success" });
      return true;
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
      return false;
    }
  };

  const sortedDbConnections = [...(connectionsQuery.data ?? [])].sort((a, b) => {
    const direction = dbSort.dir === "asc" ? 1 : -1;
    if (dbSort.key === "name") return direction * a.label.localeCompare(b.label);
    return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
  });

  return {
    sortedDbConnections,
    loadingDbConnections: connectionsQuery.isLoading,
    expandedDbConnections,
    loadingTablesFor,
    dbTableErrors,
    dbSort,
    setDbSort,
    dbDialogOpen,
    setDbDialogOpen,
    connectingDb: createConnection.isPending,
    expandedTables,
    revealedConnUrls,
    toggleConnUrlReveal,
    toggleTable,
    connectDatabase,
    refreshConnectionTables,
    toggleDbConnectionExpansion,
    toggleDbConnectionActive,
    deleteDbConnection,
  };
}
