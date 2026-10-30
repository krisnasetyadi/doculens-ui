"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, RotateCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, NoResults } from "@/components/empty-state";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useToast, errorToast } from "@/hooks/use-toast";
import { useMyUsage } from "@/features/billing/hooks/use-my-usage";
import { useAuthStore } from "@/stores/auth-store";
import { useAnalysisRunStore } from "@/stores/analysis-run-store";
import { gapAnalysisMutations, gapAnalysisQueries } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisRunListItem } from "@/services/gap-analysis/type/gap-analysis.type";
import { AnalysisRunsTable } from "./_components/analysis-runs-table";
import { AnalysisUpgradeState } from "./_components/analysis-upgrade-state";
import { RunningAnalysisRow } from "./_components/running-analysis-row";
import { filterRuns } from "./_lib/runs";

/**
 * Analysis (MS-916): every analysis the user has run, and the one place to start a new one. Today
 * the only kind is a gap analysis of company documents against a reference framework (ISO first).
 * A workspace without it on its plan sees what it is and how to get it instead.
 */
export default function AnalysisPage() {
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const { gapCheckAvailable, isLoaded: planLoaded, error: planError, refresh: refreshPlan } = useMyUsage();
  const active = useAnalysisRunStore((s) => s.active);
  const openDrawer = useAnalysisRunStore((s) => s.setDrawerOpen);

  const runsQuery = useQuery({ ...gapAnalysisQueries.runs(), enabled: gapCheckAvailable });
  const deleteMutation = useMutation(gapAnalysisMutations.delete());

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GapAnalysisRunListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);
  // Each run names its own collections, including ones the viewer doesn't own (an admin's view of
  // a member's run). Looked up for every id of every run, on each keystroke and in each table cell.
  // A deleted collection is no longer named, so its id shows.
  const labels = useMemo(
    () => new Map(runs.flatMap((run) => Object.entries(run.collection_labels ?? {}))),
    [runs],
  );
  const labelOf = (collectionId: string) => labels.get(collectionId) ?? collectionId;

  const visibleRuns = filterRuns(runs, search, labelOf);
  // While one runs (or just failed), the button opens it rather than starting a second one.
  const newAnalysisLabel = active?.status === "running" ? "View running analysis" : "New analysis";

  const requestDelete = (run: GapAnalysisRunListItem) => {
    setDeleteTarget(run);
    setDeleteOpen(true);
  };

  /** Resolves to false on failure, so the confirmation stays open for another try. */
  const confirmDelete = () =>
    deleteMutation
      .mutateAsync(deleteTarget!.run_id)
      .then(() => {
        toast({ title: "Analysis deleted", variant: "success" });
        return true;
      })
      .catch((err: unknown) => {
        toast(errorToast("Couldn't delete this analysis", err));
        return false;
      });

  const emptyState = search.trim() ? (
    <NoResults query={search} onClear={() => setSearch("")} className="my-4" />
  ) : (
    <EmptyState
      size="compact"
      icon={ShieldCheck}
      heading="No analyses yet"
      description="Check company documents against a reference framework such as ISO 27001. Each requirement is marked as met, partial or not met, with the evidence found, and every result is kept here."
      action={{ label: "New analysis", onClick: () => openDrawer(true), icon: Plus }}
      className="my-4"
    />
  );

  return (
    <div className="h-full overflow-y-auto bg-background [scrollbar-gutter:stable_both-edges]">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-manrope text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Analysis</p>
            <h1 className="mt-1 font-manrope text-2xl font-extrabold text-foreground">Analysis</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Check company documents against a reference framework and keep every result. Today: gap analysis
              against a standard such as ISO 27001.
            </p>
          </div>
          {gapCheckAvailable && (
            <Button onClick={() => openDrawer(true)} icon={<Plus className="h-4 w-4" />}>
              {newAnalysisLabel}
            </Button>
          )}
        </div>

        {!planLoaded && (
          <div role="status" className="space-y-3">
            <span className="sr-only">Loading…</span>
            <Skeleton aria-hidden="true" className="h-10 w-72" />
            <Skeleton aria-hidden="true" className="h-[420px] w-full" />
          </div>
        )}

        {/* A plan that couldn't be read is not a plan without Analysis: no upgrade pitch for a Team user. */}
        {planLoaded && !gapCheckAvailable && planError && (
          <EmptyState
            icon={TriangleAlert}
            heading="Couldn't check your plan"
            description="Something went wrong while loading it. Try again in a moment."
            action={{ label: "Try again", onClick: () => void refreshPlan(), icon: RotateCw }}
          />
        )}

        {planLoaded && !gapCheckAvailable && !planError && <AnalysisUpgradeState isAdmin={isAdmin} />}

        {planLoaded && gapCheckAvailable && (
          <>
            {active && <RunningAnalysisRow active={active} onOpen={() => openDrawer(true)} />}

            {runsQuery.isError ? (
              <EmptyState
                icon={TriangleAlert}
                heading="Couldn't load your analyses"
                description="Something went wrong while loading them. Try again in a moment."
                action={{ label: "Try again", onClick: () => void runsQuery.refetch(), icon: RotateCw }}
              />
            ) : (
              <>
                {runs.length > 0 && (
                  <div className="relative max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      aria-label="Search analyses"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by framework or document"
                      className="pl-9"
                    />
                  </div>
                )}
                <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-4 shadow-xs">
                  <AnalysisRunsTable
                    runs={visibleRuns}
                    labelOf={labelOf}
                    showRunBy={isAdmin}
                    isLoading={runsQuery.isPending}
                    emptyState={emptyState}
                    onDelete={requestDelete}
                  />
                </div>
              </>
            )}
          </>
        )}

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this analysis?"
          description={deleteTarget ? `"${deleteTarget.framework_name}" and its result will be removed. This cannot be undone.` : ""}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
