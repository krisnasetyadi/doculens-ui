"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import { isMissingError } from "@/services/api-error";
import { EmptyState } from "@/components/empty-state";
import { pdfCollectionsApi } from "@/services/pdf-collections/handler/pdf-collections.api";
import type { PdfCollection } from "@/services/pdf-collections/type/pdf-collection.type";
import type { GapAnalysisItem, GapAnalysisResponse } from "@/services";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STATUS_LABEL,
  buildGapItemColumns,
  downloadExport,
} from "@/components/gap-analysis-shared";
import { ArrowLeft, ChevronDown, Download, FileSearch, FileText, House, Loader2, RotateCw, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";

// Centers a state between the Back row and the bottom of the scroll area. The
// negative margins cancel the container's gap-4 (top) and py-8 (bottom), so the
// state is centered in exactly that space. Change those two and change this.
const CENTERED_STATE_CLASS = "-mb-8 -mt-4 flex flex-1 items-center justify-center";

export default function ComplianceResultPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const router = useRouter();
  const { toast } = useToast();

  const [result, setResult] = useState<GapAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // "missing": no such run, or not this user's. "failed": anything else (network, 5xx).
  const [loadError, setLoadError] = useState<"missing" | "failed" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pdfCollections, setPdfCollections] = useState<PdfCollection[]>([]);
  const [downloading, setDownloading] = useState<"markdown" | "pdf" | null>(null);

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

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    GapAnalysisApi.getRun<GapAnalysisResponse>(runId)
      .then(setResult)
      .catch((err) => {
        setResult(null);
        setLoadError(isMissingError(err) ? "missing" : "failed");
      })
      .finally(() => setLoading(false));
  }, [runId, reloadKey]);

  useEffect(() => {
    pdfCollectionsApi.list()
      .then(setPdfCollections)
      .catch(() => {});
  }, []);

  const collectionLabel = (c: PdfCollection) => c.title || c.file_names?.[0] || c.collection_id;
  const collectionLabelById = (id: string) => {
    const match = pdfCollections.find((c) => c.collection_id === id);
    return match ? collectionLabel(match) : id;
  };

  const handleDownload = (format: "markdown" | "pdf") => {
    if (!result) return;
    setDownloading(format);
    downloadExport(result.run.run_id, format)
      .catch((err) =>
        toast({
          title: "Download gagal",
          description: err instanceof Error ? err.message : "Coba lagi.",
          variant: "destructive",
        }),
      )
      .finally(() => setDownloading(null));
  };

  const hasMultipleTargets = (result?.run.target_collection_ids?.length ?? 0) > 1;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex min-h-full max-w-7xl flex-col gap-4 mx-auto px-4 sm:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {loading && (
          <div className="space-y-4">
            <div className="flex w-full justify-between">
              <Skeleton className="h-8 w-64 rounded-lg" />
              <Skeleton className="h-5 w-36 rounded-md" />
            </div>
            <Skeleton className="h-[68px] w-full rounded-2xl" />
            <Skeleton className="h-[520px] w-full rounded-2xl" />
          </div>
        )}

        {!loading && !result && loadError === "missing" && (
          <div className={CENTERED_STATE_CLASS}>
            <EmptyState
              icon={<FileSearch />}
              heading="Result not found"
              label="This gap analysis result may have been deleted, or it belongs to another account."
              actionHref="/home"
              uploadLabel="Go to Home"
              uploadIcon={<House className="size-3.5" />}
              ctaVariant="primary"
            />
          </div>
        )}

        {!loading && !result && loadError === "failed" && (
          <div className={CENTERED_STATE_CLASS}>
            <EmptyState
              icon={<TriangleAlert />}
              heading="Could not load this result"
              label="Something went wrong while loading it. Try again in a moment."
              onUpload={() => setReloadKey((k) => k + 1)}
              uploadLabel="Try again"
              uploadIcon={<RotateCw className="size-3.5" />}
              ctaVariant="primary"
            />
          </div>
        )}

        {!loading && result && (
          <>
            <div className="flex w-full justify-between">
              <h1 className="flex items-center gap-2 font-['Manrope'] text-2xl font-extrabold text-foreground">
                <ShieldCheck className="h-6 w-6 text-primary" />
                {result.run.framework_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(result.run.created_at).toLocaleString()}
              </p>
            </div>

            {result.disclaimer && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                {result.disclaimer}
              </p>
            )}

            <Card className="rounded-2xl py-4">
              <CardContent className="px-4 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Cari item, nama file, evidence, atau rekomendasi…"
                      className="rounded-2xl pl-9"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-[180px] rounded-xl">
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
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            {result.items.length}
                          </span>
                        </span>
                      </SelectItem>
                      {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="flex w-full items-center justify-between gap-2">
                            <span>{STATUS_LABEL[status]}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                              {result.summary[status as keyof typeof result.summary] ?? 0}
                            </span>
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
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Reset filter
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={downloading !== null}
                        className="rounded-xl font-['Manrope'] font-bold ml-auto"
                      >
                        {downloading !== null ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download
                        <ChevronDown className="h-4 w-4 ml-1.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => handleDownload("pdf")} className="font-['Manrope'] font-semibold gap-2">
                        <FileText className="h-4 w-4" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload("markdown")} className="font-['Manrope'] font-semibold gap-2">
                        <FileText className="h-4 w-4" />
                        Markdown
                      </DropdownMenuItem>
                    </DropdownMenuContent>
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

            <Card className="rounded-2xl overflow-hidden py-6 px-4">
              <CardContent className="p-0">
                <DataTableStatic
                  data={result.items}
                  columns={buildGapItemColumns(hasMultipleTargets, collectionLabelById)}
                  features={{ enableSelection: false }}
                  defaultPageSize={20}
                  emptyState={
                    hasActiveFilters
                      ? "Tidak ada item yang cocok dengan pencarian/filter."
                      : "Tidak ada item yang berhasil diekstrak dari reference collection."
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
          </>
        )}
      </div>
    </div>
  );
}
