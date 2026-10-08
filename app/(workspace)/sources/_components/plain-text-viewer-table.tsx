"use client";

import { Check, FileX2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
import type { PlainTextLineRow } from "@/services";

export function PlainTextViewerTable({
  lines,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  lines: PlainTextLineRow[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useInfiniteScrollSentinel(hasMore, onLoadMore, lines.length);

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 rounded-lg border bg-muted/40 p-3">
          <FileX2 className="size-5 text-muted-foreground" />
        </div>
        <p className="mb-1 font-['Manrope'] text-[13px] font-semibold text-foreground">
          No content to preview
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          No readable content was found in this source.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div>
        <div className="h-[65vh] max-h-[calc(90dvh-12rem)] overflow-auto overscroll-contain [&>[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="h-8 w-16 whitespace-nowrap border-b bg-muted px-3 text-right font-['Manrope'] text-[11px] font-semibold text-muted-foreground">
                  Line
                </TableHead>
                <TableHead className="h-8 border-b bg-muted px-3 font-['Manrope'] text-[11px] font-semibold text-muted-foreground">
                  Content
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.line_number} className="align-top border-border/30 transition-colors hover:bg-primary/[0.03]">
                  <TableCell className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] text-muted-foreground">
                    {line.line_number}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap break-words px-3 py-1.5 text-xs leading-relaxed text-foreground/80">
                    {line.content || " "}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
        </div>
      </div>

      <div className="flex min-h-9 items-center justify-between gap-2 border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span role="status" aria-live="polite" aria-atomic="true" className="inline-flex min-h-4 items-center gap-1.5">
          {loadingMore ? (
            <>
              <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin text-primary motion-reduce:animate-none" />
              Loading…
            </>
          ) : !hasMore ? (
            <>
              <Check aria-hidden="true" className="h-3 w-3" />
              All loaded
            </>
          ) : null}
        </span>
        <span className="shrink-0 whitespace-nowrap tabular-nums" aria-label={`${lines.length} of ${total} ${total === 1 ? "line" : "lines"} loaded`}>
          {lines.length.toLocaleString("en-US")} / {total.toLocaleString("en-US")} {total === 1 ? "line" : "lines"}
        </span>
      </div>
    </div>
  );
}
