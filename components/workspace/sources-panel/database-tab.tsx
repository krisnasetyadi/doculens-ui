import dayjs from "dayjs";
import { Loader2, Plus, Database, Trash2, ChevronRight, ChevronDown, AlertCircle, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";
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
import { EmptyState } from "./empty-state";
import { SortBar } from "./sort-bar";
import { DbTableRow } from "./db-table-row";
import { maskConnectionUrl, toggleSort } from "./sources-types";
import type { useDatabaseTab } from "@/hooks/use-database-tab";

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
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
        {loadingDbConnections ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
          </div>
        ) : sortedDbConnections.length === 0 ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-5xl leading-none">database</span>}
            label="Connect your own PostgreSQL database to use it as a knowledge source."
            uploadLabel="Connect Database"
            uploadIcon={<Database className="h-4 w-4" />}
            onUpload={() => setDbDialogOpen(true)}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <SortBar
                sort={dbSort}
                onToggle={(k) => toggleSort(dbSort, k, setDbSort)}
              />
              <Button
                onClick={() => setDbDialogOpen(true)}
                className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs sm:shrink-0"
              >
                <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                Connect Database
              </Button>
            </div>
            <div className="space-y-3">
            {sortedDbConnections.map((conn) => {
              const isActive = conn.status === "active";
              const isExpanded = expandedDbConnections.has(conn.connection_id);
              const isLoadingTables = loadingTablesFor.has(conn.connection_id);
              const tableError = dbTableErrors[conn.connection_id];
              return (
                <div key={conn.connection_id} className="relative rounded-xl bg-card border border-border/60 overflow-hidden">
                  <span
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                  />
                  {/* Connection header */}
                  <div className="flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                    onClick={() => toggleDbConnectionExpansion(conn.connection_id)}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                      {isActive
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <span className="material-symbols-outlined text-muted-foreground/50" style={{ fontSize: 16 }}>database</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold font-['Manrope'] text-foreground truncate">
                        {conn.label}
                      </p>
                      <div className="flex items-center gap-1 min-w-0">
                        <p
                          className="text-[11px] text-muted-foreground/60 font-['Inter'] truncate"
                          title={revealedConnUrls.has(conn.connection_id) ? conn.url : undefined}
                        >
                          {revealedConnUrls.has(conn.connection_id)
                            ? conn.url
                            : maskConnectionUrl(conn.url)}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleConnUrlReveal(conn.connection_id); }}
                          className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                          aria-label={revealedConnUrls.has(conn.connection_id) ? "Hide connection URL" : "Show connection URL"}
                        >
                          {revealedConnUrls.has(conn.connection_id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); refreshConnectionTables(conn.connection_id); }}
                        disabled={isLoadingTables}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-primary font-['Manrope'] font-bold px-2 py-1 rounded-full hover:bg-primary/10 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingTables ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Refresh
                      </button>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Table list */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
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
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isLoadingTables ? (
                        <div className="flex items-center gap-2 px-2 py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground/60 font-['Inter']">Loading tables…</span>
                        </div>
                      ) : tableError ? (
                        <div className="flex items-center gap-2 px-2 py-4 text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs font-['Inter']">{tableError}</span>
                        </div>
                      ) : conn.tables.length === 0 ? (
                        <p className="px-2 py-4 text-xs text-muted-foreground/60 font-['Inter']">No tables found.</p>
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
        <DialogContent className="sm:max-w-md font-['Inter']">
          <DialogHeader>
            <DialogTitle className="font-['Manrope'] font-extrabold text-foreground">
              Connect Database
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Label</label>
              <Input
                placeholder="Analytics DB"
                value={dbLabel}
                onChange={(e) => setDbLabel(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60 font-['Inter']">Optional. Derived from the host if left blank.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">PostgreSQL connection URL</label>
              <div className="relative">
                <Input
                  type={dbUrlVisible ? "text" : "password"}
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  value={dbUrl}
                  onChange={(e) => {
                    setDbUrl(e.target.value);
                    if (dbFormError) setDbFormError(null);
                  }}
                  className="h-9 text-sm font-mono pr-9"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setDbUrlVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label={dbUrlVisible ? "Hide connection URL" : "Show connection URL"}
                >
                  {dbUrlVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                Your own database — used as a real-time knowledge source, separate from the app&apos;s own storage.
                This contains a password — keep it hidden on shared screens.
              </p>
            </div>

            {dbFormError && <FormInlineError message={dbFormError} />}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDbDialogOpen(false); setDbFormError(null); setDbUrlVisible(false); }}
              className="rounded-xl font-['Manrope'] font-semibold">
              Cancel
            </Button>
            <Button onClick={handleDbConnect} disabled={connectingDb}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all">
              {connectingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {connectingDb ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
