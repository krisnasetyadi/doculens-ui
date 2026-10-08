import dayjs from "dayjs";
import { Loader2, Plus, Database, Trash2, ChevronRight, ChevronDown, AlertCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  CARD_CLASS,
  TOOLBAR_CLASS,
  PRIMARY_BUTTON_CLASS,
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
  CONNECTION_HEAD_CLASS,
  ROW_PANEL_CLASS,
  DIALOG_BUTTON_CLASS,
  DIALOG_PRIMARY_CLASS,
  DIALOG_TITLE_CLASS,
  FIELD_HINT_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
} from "../sources-ui";
import { DANGER_ICON_BUTTON_CLASS } from "@/lib/danger-styles";

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

  return (
    <>
      {active && (
      <div className={CARD_CLASS}>
        {loadingDbConnections && sortedDbConnections.length === 0 ? (
          <SourceConnectionSkeleton label="Loading databases…" />
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
              <span className="mr-auto font-['Manrope'] text-[13px] font-bold text-foreground">All databases</span>
              <SortBar
                sort={dbSort}
                onToggle={(k) => toggleSort(dbSort, k, setDbSort)}
              />
              <Button
                onClick={() => setDbDialogOpen(true)}
                className={PRIMARY_BUTTON_CLASS}
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
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-accent" : "bg-muted"}`}>
                      {isActive
                        ? <Database className="size-[18px] text-primary" />
                        : <Database className="size-[18px] text-muted-foreground" />}
                    </div>
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
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleConnUrlReveal(conn.connection_id); }}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={revealedConnUrls.has(conn.connection_id) ? "Hide connection URL" : "Show connection URL"}
                        >
                          {revealedConnUrls.has(conn.connection_id) ? (
                            <EyeOff className="size-3" />
                          ) : (
                            <Eye className="size-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); refreshConnectionTables(conn.connection_id); }}
                        disabled={isLoadingTables}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                      >
                        {isLoadingTables ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3" />
                        )}
                        Refresh
                      </button>
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
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteDbConnection(conn.connection_id)}
                            className={`size-7 rounded-md ${DANGER_ICON_BUTTON_CLASS}`}
                            aria-label="Delete connection"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isLoadingTables ? (
                        <div role="status" aria-label="Loading tables…" className="space-y-1.5">
                          {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                              <Skeleton className="size-4 shrink-0 rounded-sm" />
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
      <Dialog open={dbDialogOpen} onOpenChange={setDbDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={DIALOG_TITLE_CLASS}>
              Connect Database
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className={FIELD_LABEL_CLASS}>Label</label>
              <Input
                placeholder="Analytics DB"
                value={dbLabel}
                onChange={(e) => setDbLabel(e.target.value)}
                className={FIELD_INPUT_CLASS}
              />
              <p className={FIELD_HINT_CLASS}>Optional. Derived from the host if left blank.</p>
            </div>
            <div className="space-y-1.5">
              <label className={FIELD_LABEL_CLASS}>PostgreSQL connection URL</label>
              <div className="relative">
                <Input
                  type={dbUrlVisible ? "text" : "password"}
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  value={dbUrl}
                  onChange={(e) => {
                    setDbUrl(e.target.value);
                    if (dbFormError) setDbFormError(null);
                  }}
                  className={`${FIELD_INPUT_CLASS} pr-9 font-mono`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setDbUrlVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label={dbUrlVisible ? "Hide connection URL" : "Show connection URL"}
                >
                  {dbUrlVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className={FIELD_HINT_CLASS}>
                Your own database — used as a real-time knowledge source, separate from the app&apos;s own storage.
                This contains a password — keep it hidden on shared screens.
              </p>
            </div>

            {dbFormError && <FormInlineError message={dbFormError} />}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDbDialogOpen(false); setDbFormError(null); setDbUrlVisible(false); }}
              className={DIALOG_BUTTON_CLASS}>
              Cancel
            </Button>
            <Button onClick={handleDbConnect} disabled={connectingDb}
              className={DIALOG_PRIMARY_CLASS}>
              {connectingDb ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
              {connectingDb ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
