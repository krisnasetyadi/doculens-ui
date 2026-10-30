"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSearch, Trash2 } from "lucide-react";
import { DataTableStatic, type ColumnDef } from "@/components/datatable";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date";
import type { GapAnalysisRunListItem } from "@/services/gap-analysis/type/gap-analysis.type";
import {
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  TruncatedCell,
} from "./gap-analysis-shared";
import { SUMMARY_ORDER } from "../_lib/runs";

interface AnalysisRunsTableProps {
  runs: GapAnalysisRunListItem[];
  /** Collection id -> its name, from the user's collections, as on a run's result page. */
  labelOf: (collectionId: string) => string;
  /** Admins see everyone's runs, so they also see who ran each one. */
  showRunBy: boolean;
  isLoading: boolean;
  emptyState: React.ReactNode;
  onDelete: (run: GapAnalysisRunListItem) => void;
}

const names = (ids: string[], labelOf: (id: string) => string) => ids.map(labelOf).join(", ");

function buildColumns(labelOf: (id: string) => string, showRunBy: boolean): ColumnDef<GapAnalysisRunListItem>[] {
  const columns: ColumnDef<GapAnalysisRunListItem>[] = [
    {
      accessorKey: "framework_name",
      header: "Framework",
      size: 200,
      minSize: 140,
      cell: ({ row }) => (
        <Link
          href={`/analysis/${row.original.run_id}`}
          className="font-manrope font-bold text-foreground hover:text-primary hover:underline"
        >
          {row.original.framework_name}
        </Link>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      size: 180,
      minSize: 120,
      // A real value, so the column sorts by name rather than by id.
      accessorFn: (run) => names(run.reference_collection_ids, labelOf),
      cell: ({ getValue, column }) => (
        <TruncatedCell text={(getValue() as string) || "—"} maxWidth={column.getSize() - 24} />
      ),
    },
    {
      id: "documents",
      header: "Company documents",
      size: 240,
      minSize: 140,
      accessorFn: (run) => names(run.target_collection_ids, labelOf),
      cell: ({ row, getValue, column }) => (
        <div className="space-y-0.5">
          <TruncatedCell text={(getValue() as string) || "—"} lines={2} maxWidth={column.getSize() - 24} />
          <span className="text-xs text-muted-foreground">
            {row.original.target_collection_ids.length}{" "}
            {row.original.target_collection_ids.length === 1 ? "document" : "documents"}
          </span>
        </div>
      ),
    },
    {
      id: "result",
      header: "Result",
      size: 240,
      minSize: 160,
      enableSorting: false,
      cell: ({ row }) => {
        const shown = SUMMARY_ORDER.filter((status) => (row.original.summary?.[status] ?? 0) > 0);
        if (shown.length === 0) return <span className="text-xs text-muted-foreground">No items</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((status) => (
              <Badge key={status} variant={STATUS_BADGE_VARIANT[status]}>
                {row.original.summary[status]} {STATUS_LABEL[status]}
              </Badge>
            ))}
          </div>
        );
      },
    },
  ];

  if (showRunBy) {
    columns.push({
      id: "run_by",
      header: "Run by",
      size: 180,
      minSize: 120,
      accessorFn: (run) => run.run_by ?? "",
      cell: ({ getValue, column }) => (
        <TruncatedCell text={(getValue() as string) || "—"} maxWidth={column.getSize() - 24} />
      ),
    });
  }

  columns.push({
    accessorKey: "created_at",
    header: "Date",
    size: 160,
    minSize: 130,
    cell: ({ row }) => <span className="whitespace-nowrap text-sm">{formatDateTime(row.original.created_at)}</span>,
  });

  return columns;
}

/** Every saved analysis, newest first (MS-916). The framework opens its result; the row menu opens or
 * deletes it. */
export function AnalysisRunsTable({ runs, labelOf, showRunBy, isLoading, emptyState, onDelete }: AnalysisRunsTableProps) {
  const router = useRouter();
  return (
    <DataTableStatic
      data={runs}
      columns={buildColumns(labelOf, showRunBy)}
      features={{ enableSelection: false }}
      defaultSorting={[{ id: "created_at", desc: true }]}
      defaultPageSize={20}
      isLoading={isLoading}
      emptyState={emptyState}
      actionItems={[
        {
          title: "Open result",
          icon: <FileSearch className="size-4" />,
          onClick: (run: GapAnalysisRunListItem) => router.push(`/analysis/${run.run_id}`),
        },
        {
          title: "Delete",
          icon: <Trash2 className="size-4" />,
          className: "text-destructive",
          onClick: (run: GapAnalysisRunListItem) => onDelete(run),
        },
      ]}
      persistence={{
        visibilityKey: "analysis-runs-columns-visibility",
        orderKey: "analysis-runs-columns-order",
        sizingKey: "analysis-runs-columns-sizing",
        pinningKey: "analysis-runs-columns-pinning",
      }}
    />
  );
}
