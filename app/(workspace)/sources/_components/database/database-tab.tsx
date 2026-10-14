import { useState } from "react";
import dayjs from "dayjs";
import { Plus, Database, Trash2, ChevronRight, ChevronDown, AlertCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormInlineError } from "@/components/forms/form-inline-error";
import { EmptyState } from "@/components/empty-state";
import { SortBar } from "../sort-bar";
import { SourceConnectionSkeleton } from "../source-connection-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { DbTableRow } from "./db-table-row";
import { maskConnectionUrl } from "../../_lib/connection-url";
import { toggleSort } from "../../_lib/sort";
import type { useDatabaseTab } from "../../_hooks/use-database-tab";
import {
  TAB_PANEL_CLASS,
  TOOLBAR_CLASS,
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
  ROW_REVEAL_CLASS,
  CONNECTION_HEAD_CLASS,
  ROW_PANEL_CLASS,
} from "../sources-ui";
import { IconButton } from "@/components/icon-button";
import { FieldHint } from "@/components/forms/field-hint";
import { Label } from "@/components/ui/label";
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
            toolbar={
              <>
                <span className="mr-auto font-manrope text-[13px] font-bold text-foreground">All databases</span>
                <Button disabled className="max-sm:flex-1">
                  <Plus className="size-3.5" />
                  Connect Database
                </Button>
              </>
            }
          />
        ) : sortedDbConnections.length === 0 ? (
          <EmptyState
            icon={<Database />}
            heading="Your databases will show up here"
            label="Connect your own PostgreSQL database to use it as a knowledge source."
            uploadLabel="Connect Database"
            uploadIcon={<Database className="size-3.5" />}
            onUpload={() => setDbDialogOpen(true)}
          />
        ) : (
          <>
            <div className={TOOLBAR_CLASS}>
              <span className="mr-auto font-manrope text-[13px] font-bold text-foreground">All databases</span>
              <SortBar
                sort={dbSort}
                onToggle={(k) => toggleSort(dbSort, k, setDbSort)}
              />
              <Button
                onClick={() => setDbDialogOpen(true)}
                className="max-sm:flex-1"
              >
                <Plus className="size-3.5" />
                Connect Database
              </Button>
            </div>
            <div>
            {sortedDbConnections.map((conn) => {
              const isActive = conn.status === "active";
              const isExpanded = expandedDbConnections.has(conn.connection_id);
              const isLoadingTables = loadingTablesFor.has(conn.connection_id);
              const tableError = dbTableErrors[conn.connection_id];
              return (
                <div key={conn.connection_id} className="border-b last:border-b-0">
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
                        <p
                          className={`${ROW_META_CLASS} truncate`}
                          title={revealedConnUrls.has(conn.connection_id) ? conn.url : undefined}
                        >
                          {revealedConnUrls.has(conn.connection_id)
                            ? conn.url
                            : maskConnectionUrl(conn.url)}
                        </p>
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
                          Connected {dayjs(conn.created_at).format("DD MMM YYYY, HH:mm")}
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
                        <p className="px-2 py-4 text-[11px] text-muted-foreground">No tables found.</p>
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

      {/* ── DB Connect Dialog ─────────────────────────────────────────── */}
      <Dialog open={dbDialogOpen} onOpenChange={(open) => { if (!connectingDb) setDbDialogOpen(open); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Connect Database
            </DialogTitle>
          </DialogHeader>
          <FormFieldset busy={connectingDb}>

            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  placeholder="Analytics DB"
                  value={dbLabel}
                  onChange={(e) => setDbLabel(e.target.value)}
                />
                <FieldHint>Optional. Derived from the host if left blank.</FieldHint>
              </div>
              <div className="space-y-1.5">
                <Label>PostgreSQL connection URL</Label>
                <div className="relative">
                  <Input
                    type={dbUrlVisible ? "text" : "password"}
                    placeholder="postgresql://user:pass@host:5432/dbname"
                    value={dbUrl}
                    onChange={(e) => {
                      setDbUrl(e.target.value);
                      if (dbFormError) setDbFormError(null);
                    }}
                    className="pr-9 font-mono"
                    autoComplete="off"
                  />
                  <IconButton
                    size="sm"
                    type="button"
                    label={dbUrlVisible ? "Hide connection URL" : "Show connection URL"}
                    onClick={() => setDbUrlVisible((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    {dbUrlVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </IconButton>
                </div>
                <FieldHint>
                  Your own database — used as a real-time knowledge source, separate from the app&apos;s own storage.
                  This contains a password — keep it hidden on shared screens.
                </FieldHint>
              </div>

              {dbFormError && <FormInlineError message={dbFormError} />}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDbDialogOpen(false); setDbFormError(null); setDbUrlVisible(false); }}>
                Cancel
              </Button>
              <Button onClick={handleDbConnect} loading={connectingDb} loadingText="Connecting…" icon={<Database className="size-3.5" />}>
                Connect
              </Button>
            </DialogFooter>
          </FormFieldset>
        </DialogContent>
      </Dialog>

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
