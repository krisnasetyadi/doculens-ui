import { useState } from "react";
import { formatDateTime } from "@/lib/date";
import { Plus, Database, Trash2, ChevronRight, ChevronDown, AlertCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import { ConnectionToolbar } from "../connection-toolbar";
import { SourceConnectionSkeleton } from "../source-connection-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { DbTableRow } from "./db-table-row";
import { DatabaseConnectDialog } from "./database-connect-dialog";
import { maskConnectionUrl } from "../../_lib/connection-url";
import { toggleSort } from "../../_lib/sort";
import type { useDatabaseTab } from "../../_hooks/use-database-tab";
import {
  TAB_PANEL_CLASS,
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
  ROW_REVEAL_CLASS,
  CONNECTION_HEAD_CLASS,
  ROW_PANEL_CLASS,
} from "../sources-ui";
import { IconButton } from "@/components/icon-button";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { IconTile } from "@/components/icon-tile";

export function DatabaseTab({ tab, active }: { tab: ReturnType<typeof useDatabaseTab>; active: boolean }) {
  const {
    sortedDbConnections,
    loadingDbConnections,
    expandedDbConnections,
    loadingTablesFor,
    dbTableErrors,
    dbSort,
    setDbSort,
    dbDialogOpen,
    setDbDialogOpen,
    connectingDb,
    expandedTables,
    revealedConnUrls,
    toggleConnUrlReveal,
    toggleTable,
    connectDatabase,
    refreshConnectionTables,
    toggleDbConnectionExpansion,
    toggleDbConnectionActive,
    deleteDbConnection,
  } = tab;
  // The connection the trash button was pressed on; a delete is confirmed before it runs. The target is
  // kept after the dialog closes so its text does not blank out while it fades.
  const [deleteTarget, setDeleteTarget] = useState<(typeof sortedDbConnections)[number] | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {active && (
      <div className={TAB_PANEL_CLASS}>
        {loadingDbConnections && sortedDbConnections.length === 0 ? (
          <SourceConnectionSkeleton
            label="Loading databases…"
            title="All databases"
            toolbar={
              <>
                <Button disabled className="max-sm:flex-1">
                  <Plus className="size-3.5" />
                  Connect Database
                </Button>
              </>
            }
          />
        ) : sortedDbConnections.length === 0 ? (
          <EmptyState
            icon={Database}
            heading="Your databases will show up here"
            description="Connect your own PostgreSQL database to use it as a knowledge source."
            action={{ label: "Connect Database", onClick: () => setDbDialogOpen(true), icon: Database }}
          />
        ) : (
          <>
            <ConnectionToolbar
              title="All databases"
              sort={sortedDbConnections.length > 1 ? dbSort : undefined}
              onSort={(k) => toggleSort(dbSort, k, setDbSort)}
              action={
                <Button
                  onClick={() => setDbDialogOpen(true)}
                  className="max-sm:flex-1"
                >
                  <Plus className="size-3.5" />
                  Connect Database
                </Button>
              }
            />
            <div>
            {sortedDbConnections.map((conn) => {
              const isActive = conn.status === "active";
              const isExpanded = expandedDbConnections.has(conn.connection_id);
              const isLoadingTables = loadingTablesFor.has(conn.connection_id);
              const tableError = dbTableErrors[conn.connection_id];
              return (
                <div key={conn.connection_id}>
                  {/* Connection header */}
                  <div className={CONNECTION_HEAD_CLASS}
                    onClick={() => toggleDbConnectionExpansion(conn.connection_id)}>
                    <IconTile tone={isActive ? "accent" : "muted"}>
                      {isActive
                        ? <Database className="size-[18px] text-primary" />
                        : <Database className="size-[18px] text-muted-foreground" />}
                    </IconTile>
                    <div className="flex-1 min-w-0">
                      <p className={ROW_TITLE_CLASS}>
                        {conn.label}
                      </p>
                      <div className="flex items-center gap-1 min-w-0">
                        <TruncatedTooltip
                          label={revealedConnUrls.has(conn.connection_id) ? conn.url : maskConnectionUrl(conn.url)}
                        >
                          <p className={`${ROW_META_CLASS} truncate`}>
                            {revealedConnUrls.has(conn.connection_id)
                              ? conn.url
                              : maskConnectionUrl(conn.url)}
                          </p>
                        </TruncatedTooltip>
                        <IconButton
                          size="sm"
                          label={revealedConnUrls.has(conn.connection_id) ? "Hide connection URL" : "Show connection URL"}
                          onClick={(e) => { e.stopPropagation(); toggleConnUrlReveal(conn.connection_id); }}
                          className="shrink-0"
                        >
                          {revealedConnUrls.has(conn.connection_id) ? (
                            <EyeOff className="size-3" />
                          ) : (
                            <Eye className="size-3" />
                          )}
                        </IconButton>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={(e) => { e.stopPropagation(); refreshConnectionTables(conn.connection_id); }}
                        loading={isLoadingTables}
                        loadingText="Refreshing…"
                        icon={<RefreshCw className="size-3" />}
                        className={ROW_REVEAL_CLASS}
                      >
                        Refresh
                      </Button>
                      {isExpanded
                        ? <ChevronDown className="size-4 text-muted-foreground" />
                        : <ChevronRight className="size-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Table list */}
                  {isExpanded && (
                    <div className={ROW_PANEL_CLASS}>
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-[11px] text-muted-foreground">
                          Connected {formatDateTime(conn.created_at)}
                        </p>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => toggleDbConnectionActive(conn.connection_id, checked)}
                            aria-label={isActive ? "Deactivate connection" : "Activate connection"}
                          />
                          <IconButton
                            danger
                            size="sm"
                            label="Delete connection"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(conn); setDeleteOpen(true); }}
                          >
                            <Trash2 className="size-3.5" />
                          </IconButton>
                        </div>
                      </div>

                      {isLoadingTables ? (
                        <div role="status" aria-label="Loading tables…" className="space-y-1.5">
                          {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                              <Skeleton className="size-4 shrink-0" />
                              <Skeleton className="h-3 w-2/5" />
                              <Skeleton className="ml-auto h-[11px] w-16" />
                            </div>
                          ))}
                        </div>
                      ) : tableError ? (
                        <div className="flex items-center gap-2 px-2 py-4 text-destructive">
                          <AlertCircle className="size-3.5" />
                          <span className="text-xs">{tableError}</span>
                        </div>
                      ) : conn.tables.length === 0 ? (
                        <EmptyState size="inline" heading="No tables found" className="py-4" />
                      ) : (
                        <div className="space-y-1.5">
                          {conn.tables.map((t) => (
                            <DbTableRow
                              key={t.name}
                              table={t}
                              expanded={expandedTables.has(t.name)}
                              onToggle={() => toggleTable(t.name)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>
      )}

      <DatabaseConnectDialog
        open={dbDialogOpen}
        onOpenChange={setDbDialogOpen}
        connecting={connectingDb}
        onConnect={connectDatabase}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this connection?"
        description={`"${deleteTarget?.label ?? ""}" will be removed from your sources and can no longer be used to answer questions. Your database itself is not changed.`}
        onConfirm={() => deleteDbConnection(deleteTarget!.connection_id)}
      />
    </>
  );
}
