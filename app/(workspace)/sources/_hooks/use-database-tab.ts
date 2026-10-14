import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  databaseConnectionsMutations,
  databaseConnectionsQueries,
} from "@/services/database-connections/handler/database-connections.queries";
import type { SortState } from "../_types/sources.type";

const toggleInSet = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

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
  const [dbUrl, setDbUrl] = useState("");
  const [dbUrlVisible, setDbUrlVisible] = useState(false);
  const [dbLabel, setDbLabel] = useState("");
  const [dbFormError, setDbFormError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [revealedConnUrls, setRevealedConnUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!connectionsQuery.isError) return;
    toast({ title: "Error", description: "Failed to load database connections", variant: "destructive" });
  }, [connectionsQuery.isError, toast]);

  const toggleConnUrlReveal = (id: string) => setRevealedConnUrls((prev) => toggleInSet(prev, id));
  const toggleTable = (name: string) => setExpandedTables((prev) => toggleInSet(prev, name));

  const handleDbConnect = async () => {
    setDbFormError(null);
    const trimmedUrl = dbUrl.trim();
    if (!trimmedUrl) {
      setDbFormError("Please enter a connection URL");
      return;
    }

    try {
      const created = await createConnection.mutateAsync({
        label: dbLabel.trim() || undefined,
        url: trimmedUrl,
      });
      setExpandedDbConnections((prev) => new Set(prev).add(created.connection_id));
      setDbDialogOpen(false);
      setDbUrl("");
      setDbLabel("");
      setDbUrlVisible(false);
      toast({ title: "Database connected", description: `${created.table_count} table(s) found.`, variant: "success" });
    } catch {
      setDbFormError("Could not connect. Check the URL and try again.");
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
    dbUrl,
    setDbUrl,
    dbUrlVisible,
    setDbUrlVisible,
    dbLabel,
    setDbLabel,
    connectingDb: createConnection.isPending,
    dbFormError,
    setDbFormError,
    expandedTables,
    revealedConnUrls,
    toggleConnUrlReveal,
    toggleTable,
    handleDbConnect,
    refreshConnectionTables,
    toggleDbConnectionExpansion,
    toggleDbConnectionActive,
    deleteDbConnection,
  };
}
