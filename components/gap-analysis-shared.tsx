"use client";

// Shared between the Compliance Gap Check drawer (form + trigger) and the
// dedicated /compliance/[runId] results page — kept separate from the
// drawer so the drawer doesn't need to import DataTableStatic just to
// re-export column defs it no longer renders itself.

import type { GapAnalysisItem } from "@/services";
import { getAuthHeader } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ColumnDef } from "@/components/datatable";

export const STATUS_LABEL: Record<string, string> = {
  met: "Terpenuhi",
  partial: "Sebagian",
  not_met: "Belum",
  unknown: "Tidak jelas",
};

export const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  met: "default",
  partial: "secondary",
  not_met: "destructive",
  unknown: "outline",
};

/** Pill styling for the results table's Status column — pairs with
 * variant="outline" (no fill/border of its own) so these light tinted
 * backgrounds + colored border/text show through instead of fighting the
 * Badge component's solid "destructive"/"default" fills. */
export const STATUS_BADGE_CLASS: Record<string, string> = {
  met: "rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "rounded-full border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  not_met: "rounded-full border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  unknown: "rounded-full border-border bg-muted text-muted-foreground",
};

/** Truncated text that reveals the full value in a tooltip on hover/focus —
 * used for table cells whose content (item titles, evidence, recommendations)
 * can be arbitrarily long free-text from the LLM. */
export function TruncatedCell({
  text,
  lines = 1,
  maxWidth,
}: {
  text: string;
  lines?: 1 | 2 | 3;
  /** Bind to the column's live (resized) width so shrinking the column
   * actually shrinks what's rendered, instead of the column being unable
   * to go below whatever width the unclamped content demands. */
  maxWidth?: number;
}) {
  const clampClass = lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "line-clamp-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`block ${clampClass} cursor-default`}
          style={maxWidth !== undefined ? { maxWidth } : undefined}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap break-words text-left">{text}</TooltipContent>
    </Tooltip>
  );
}

/** Column defs for the gap-analysis results DataTableStatic. "File" only
 * shows up when the run checked more than one target collection — with a
 * single target every row would repeat the same filename, which is just
 * noise. */
export function buildGapItemColumns(
  hasMultipleTargets: boolean,
  collectionLabelById: (id: string) => string,
): ColumnDef<GapAnalysisItem>[] {
  const columns: ColumnDef<GapAnalysisItem>[] = [
    {
      accessorKey: "label",
      size: 200,
      minSize: 120,
      maxSize: 400,
      header: "Item",
      cell: ({ row, column }) => (
        <TruncatedCell
          text={row.original.label}
          lines={2}
          maxWidth={column.getSize() - 24}
        />
      ),
    },
  ];

  if (hasMultipleTargets) {
    columns.push({
      id: "file",
      header: "File",
      size: 200,
      minSize: 120,
      maxSize: 400,
      // accessorFn (not just a cell renderer) so the resolved filename is a
      // real cell value — the table's global search filter matches against
      // column values via getValue(), which a bare `cell` render fn can't
      // supply on its own, so without this "File" was invisible to search.
      accessorFn: (row) =>
        row.target_collection_id ? collectionLabelById(row.target_collection_id) : "",
      cell: ({ getValue, column }) => (
        <TruncatedCell
          text={(getValue() as string) || "—"}
          lines={2}
          maxWidth={column.getSize() - 24}
        />
      ),
    });
  }

  columns.push(
    {
      accessorKey: "status",
      header: "Status",
      // Exact match, not tanstack's default substring filter — otherwise
      // filtering to "met" would also pull in every "not_met" row.
      filterFn: "equalsString",
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_BADGE_CLASS[row.original.status]}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "evidence",
      header: "Evidence",
      size: 320,
      minSize: 200,
      maxSize: 640,
      cell: ({ row, column }) =>
        row.original.evidence ? (
          <span
            className="block whitespace-pre-wrap break-words text-xs text-muted-foreground"
            style={{ maxWidth: column.getSize() - 24 }}
          >
            {row.original.evidence}
          </span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "recommendation",
      header: "Rekomendasi",
      size: 320,
      minSize: 200,
      maxSize: 640,
      cell: ({ row, column }) =>
        row.original.recommendation ? (
          <span
            className="block whitespace-pre-wrap break-words text-xs text-muted-foreground"
            style={{ maxWidth: column.getSize() - 24 }}
          >
            {row.original.recommendation}
          </span>
        ) : (
          "—"
        ),
    },
  );

  return columns;
}

/** Download an export — a separate path from viewing the full result in-app;
 * download is for taking the report outside the app, not the only way to see it. */
export async function downloadExport(runId: string, format: "markdown" | "pdf") {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const res = await fetch(
    `${baseUrl}/api/v1/analysis/gap-analysis/${runId}/export?format=${format}`,
    { headers: getAuthHeader() },
  );
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gap-analysis-${runId}.${format === "pdf" ? "pdf" : "md"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
