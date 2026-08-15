import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useToast } from "@/hooks/use-toast";
import { DatabaseConnectionApi } from "@/services/resources/database-connection-api";
import type {
  DatabaseConnectionSource,
  DatabaseConnectionsResponse,
  DeleteResponse,
} from "@/services";
import type { SortState } from "@/components/workspace/sources-panel/sources-types";

export function useDatabaseTab({
  isAdmin,
  onDbConnectionIdsChange,
}: {
  isAdmin: boolean;
  onDbConnectionIdsChange?: (ids: string[]) => void;
}) {
  const { toast } = useToast();

  const [dbConnections, setDbConnections] = useState<DatabaseConnectionSource[]>([]);
  const [loadingDbConnections, setLoadingDbConnections] = useState(false);
  const [expandedDbConnections, setExpandedDbConnections] = useState<Set<string>>(new Set());
  const [loadingTablesFor, setLoadingTablesFor] = useState<Set<string>>(new Set());
  const [dbTableErrors, setDbTableErrors] = useState<Record<string, string>>({});
  const [dbSort, setDbSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [dbUrl, setDbUrl] = useState("");
  const [dbUrlVisible, setDbUrlVisible] = useState(false);
  const [dbLabel, setDbLabel] = useState("");
  const [connectingDb, setConnectingDb] = useState(false);
  const [dbFormError, setDbFormError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [revealedConnUrls, setRevealedConnUrls] = useState<Set<string>>(new Set());

  const toggleConnUrlReveal = (id: string) =>
    setRevealedConnUrls((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTable = (name: string) =>
    setExpandedTables((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const fetchDatabaseConnections = () => {
    setLoadingDbConnections(true);
    DatabaseConnectionApi.list<DatabaseConnectionsResponse | DatabaseConnectionSource[]>()
      .then((raw) => {
        const connections = Array.isArray(raw) ? raw : raw.connections ?? [];
        setDbConnections(connections);
        const activeIds = connections
          .filter((c) => c.status === "active")
          .map((c) => c.connection_id);
        onDbConnectionIdsChange?.(activeIds);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load database connections",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingDbConnections(false));
  };

  useEffect(() => {
    // Database is an admin-only source — fetching it for everyone else just
    // trips the backend's role check and surfaces confusing error toasts.
    if (isAdmin) {
      fetchDatabaseConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleDbConnect = async () => {
    setDbFormError(null);
    const trimmedUrl = dbUrl.trim();
    if (!trimmedUrl) {
      setDbFormError("Please enter a connection URL");
      return;
    }

    setConnectingDb(true);
    try {
      const created = await DatabaseConnectionApi.create<DatabaseConnectionSource>({
        label: dbLabel.trim() || undefined,
        url: trimmedUrl,
      });
      setDbConnections((prev) => {
        const next = [created, ...prev];
        onDbConnectionIdsChange?.(
          next.filter((c) => c.status === "active").map((c) => c.connection_id),
        );
        return next;
      });
      setExpandedDbConnections((prev) => new Set(prev).add(created.connection_id));
      setDbDialogOpen(false);
      setDbUrl("");
      setDbLabel("");
      setDbUrlVisible(false);
      toast({ title: "Database connected", description: `${created.table_count} table(s) found.`, variant: "success" });
    } catch (e: any) {
      setDbFormError("Could not connect. Check the URL and try again.");
    } finally {
      setConnectingDb(false);
    }
  };

  const refreshConnectionTables = async (id: string) => {
    setLoadingTablesFor((prev) => new Set(prev).add(id));
    setDbTableErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const updated = await DatabaseConnectionApi.tables<DatabaseConnectionSource>(id);
      setDbConnections((prev) => prev.map((c) => (c.connection_id === id ? updated : c)));
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
    setExpandedDbConnections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Lazily fetch tables the first time a connection is expanded.
        refreshConnectionTables(id);
      }
      return next;
    });
  };

  const toggleDbConnectionActive = (id: string, active: boolean) => {
    DatabaseConnectionApi.activate<{ status: string }>({ connection_id: id, active })
      .then(() => {
        setDbConnections((prev) => {
          const next = prev.map((c) =>
            c.connection_id === id ? { ...c, status: active ? "active" as const : "inactive" as const } : c,
          );
          onDbConnectionIdsChange?.(
            next.filter((c) => c.status === "active").map((c) => c.connection_id),
          );
          return next;
        });
      })
      .catch(() => {
        toast({ title: "Failed to update active status", variant: "destructive" });
      });
  };

  const deleteDbConnection = (id: string) => {
    DatabaseConnectionApi.delete<DeleteResponse>(id)
      .then(() => {
        setDbConnections((prev) => {
          const next = prev.filter((c) => c.connection_id !== id);
          onDbConnectionIdsChange?.(
            next.filter((c) => c.status === "active").map((c) => c.connection_id),
          );
          return next;
        });
        toast({ title: "Connection deleted", variant: "success" });
      })
      .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
  };

  const sortedDbConnections = [...dbConnections].sort((a, b) => {
    const direction = dbSort.dir === "asc" ? 1 : -1;
    if (dbSort.key === "name") return direction * a.label.localeCompare(b.label);
    return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
  });

  return {
    sortedDbConnections,
    loadingDbConnections,
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
    connectingDb,
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
