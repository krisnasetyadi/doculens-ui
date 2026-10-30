"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isMissingError } from "@/services/api-error";
import { EmptyState, NoResults } from "@/components/empty-state";
import { gapAnalysisKeys } from "@/services/gap-analysis/handler/gap-analysis.keys";
import { gapAnalysisMutations, gapAnalysisQueries } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisExportFormat, GapAnalysisItem } from "@/services/gap-analysis/type/gap-analysis.type";
import { useToast, errorToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date";
import { saveBlob } from "@/lib/save-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableStatic, type Table } from "@/components/datatable";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem } from "@/components/action-menu";
import { MENU_LUCIDE, MenuIcon } from "@/components/ui/menu-icons";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  STATUS_LABEL,
  buildGapItemColumns,
} from "../_components/gap-analysis-shared";
import { ArrowLeft, ChevronDown, Download, FileSearch, FileText, RotateCw, Search, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Centers a state between the Back row and the bottom of the scroll area. The
// negative margins cancel the container's gap-4 (top) and py-8 (bottom), so the
// state is centered in exactly that space. Change those two and change this.
const CENTERED_STATE_CLASS = "-mb-8 -mt-4 flex flex-1 items-center justify-center";

export default function AnalysisResultPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const runQuery = useQuery(gapAnalysisQueries.run(runId));
  const result = runQuery.data ?? null;

  const exportMutation = useMutation(gapAnalysisMutations.export());
  const deleteMutation = useMutation(gapAnalysisMutations.delete());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState<GapAnalysisExportFormat | null>(null);

  const [table, setTable] = useState<Table<GapAnalysisItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    table?.setGlobalFilter(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    table?.getColumn("status")?.setFilterValue(value === "all" ? undefined : value);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    table?.setGlobalFilter("");
    table?.getColumn("status")?.setFilterValue(undefined);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  // A deleted collection is no longer named by the run, so its id shows.
  const collectionLabelById = (id: string) => result?.run.collection_labels?.[id] ?? id;

  const handleDownload = (format: GapAnalysisExportFormat) => {
    if (!result) return;
    setDownloading(format);
    exportMutation.mutate(
      { runId: result.run.run_id, format },
      {
        onSuccess: (blob) => saveBlob(blob, `gap-analysis-${result.run.run_id}.${format === "pdf" ? "pdf" : "md"}`),
        onError: (err) => toast(errorToast("Couldn't download the result", err)),
        onSettled: () => setDownloading(null),
      },
    );
  };

  /** Resolves to false on failure, so the confirmation stays open for another try. */
  const handleDelete = () =>
    deleteMutation
      .mutateAsync(runId)
      .then(() => {
        router.push("/analysis");
        // The page is leaving; drop its cached result instead of refetching a run that is gone.
        queryClient.removeQueries({ queryKey: gapAnalysisKeys.run(runId) });
        toast({ title: "Analysis deleted", variant: "success" });
        return true;
      })
      .catch((err: unknown) => {
        toast(errorToast("Couldn't delete this analysis", err));
        return false;
      });

  const loading = runQuery.isPending;
  const loadError = runQuery.isError ? (isMissingError(runQuery.error) ? "missing" : "failed") : null;
  const hasMultipleTargets = (result?.run.target_collection_ids?.length ?? 0) > 1;

  return (
    <div className="h-full overflow-y-auto bg-background [scrollbar-gutter:stable_both-edges]">
      <div className="flex min-h-full max-w-7xl flex-col gap-4 mx-auto px-4 sm:px-8 py-8">
        <Link
          href="/analysis"
          className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analysis
        </Link>

        {loading && (
          <div role="status" className="space-y-4">
            <span className="sr-only">Loading result…</span>
            <div aria-hidden="true" className="space-y-4">
              <div className="flex w-full justify-between">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-[68px] w-full" />
              <Skeleton className="h-[520px] w-full" />
            </div>
          </div>
        )}

        {!loading && !result && loadError === "missing" && (
          <div className={CENTERED_STATE_CLASS}>
            <EmptyState
              icon={FileSearch}
              heading="Result not found"
              description="This analysis may have been deleted, or it belongs to another account."
              action={{ label: "Back to Analysis", onClick: () => router.push("/analysis"), icon: ArrowLeft }}
              ctaVariant="primary"
            />
          </div>
        )}

        {!loading && !result && loadError === "failed" && (
          <div className={CENTERED_STATE_CLASS}>
            <EmptyState
              icon={TriangleAlert}
              heading="Could not load this result"
              description="Something went wrong while loading it. Try again in a moment."
              action={{ label: "Try again", onClick: () => void runQuery.refetch(), icon: RotateCw }}
              ctaVariant="primary"
            />
          </div>
        )}

        {!loading && result && (
          <>
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-manrope text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Gap analysis</p>
                <h1 className="mt-1 flex items-center gap-2 font-manrope text-2xl font-extrabold text-foreground">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
                  {result.run.framework_name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(result.run.created_at)}</p>
              </div>
              <Button variant="outline" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="h-4 w-4" />}>
                Delete
              </Button>
            </div>

            {result.disclaimer && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                {result.disclaimer}
              </p>
            )}

            <Card className="py-4">
              <CardContent className="px-4 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Cari item, nama file, evidence, atau rekomendasi…"
                      className="pl-9"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Semua status">
                        {statusFilter === "all"
                          ? "Semua Status"
                          : STATUS_LABEL[statusFilter as keyof typeof STATUS_LABEL]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex w-full items-center justify-between gap-2">
                          <span>Semua Status</span>
                          <Badge variant="secondary">
                            {result.items.length}
                          </Badge>
                        </span>
                      </SelectItem>
                      {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="flex w-full items-center justify-between gap-2">
                            <span>{STATUS_LABEL[status]}</span>
                            <Badge variant="secondary">
                              {result.summary[status as keyof typeof result.summary] ?? 0}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Reset filter
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        loading={downloading !== null}
                        loadingText="Downloading…"
                        icon={<Download className="h-4 w-4" />}
                        className="ml-auto"
                      >
                        Download
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <ActionMenuContent align="end">
                      <ActionMenuItem onClick={() => handleDownload("pdf")}>
                        <MenuIcon><FileText {...MENU_LUCIDE} /></MenuIcon>
                        PDF
                      </ActionMenuItem>
                      <ActionMenuItem onClick={() => handleDownload("markdown")}>
                        <MenuIcon><FileText {...MENU_LUCIDE} /></MenuIcon>
                        Markdown
                      </ActionMenuItem>
                    </ActionMenuContent>
                  </DropdownMenu>
                </div>

                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground">
                    Menampilkan {table?.getFilteredRowModel().rows.length ?? 0} dari {result.items.length} item —
                    filter ini hanya untuk tampilan, Download tetap berisi semua item.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden py-6 px-4">
              <CardContent className="p-0">
                <DataTableStatic
                  data={result.items}
                  columns={buildGapItemColumns(hasMultipleTargets, collectionLabelById)}
                  features={{ enableSelection: false }}
                  defaultPageSize={20}
                  emptyState={
                    hasActiveFilters ? (
                      <NoResults onClear={resetFilters} className="my-4" />
                    ) : (
                      <EmptyState
                        size="compact"
                        icon={FileSearch}
                        heading="No items extracted"
                        description="No items could be extracted from the reference collection."
                        className="my-4"
                      />
                    )
                  }
                  onTableReady={setTable}
                  persistence={{
                    visibilityKey: "gap-analysis-columns-visibility",
                    orderKey: "gap-analysis-columns-order",
                    sizingKey: "gap-analysis-columns-sizing",
                    pinningKey: "gap-analysis-columns-pinning",
                  }}
                />
              </CardContent>
            </Card>

            <DeleteConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this analysis?"
              description={`"${result.run.framework_name}" and its result will be removed. This cannot be undone.`}
              onConfirm={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
