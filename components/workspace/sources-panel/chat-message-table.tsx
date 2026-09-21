"use client";

import dayjs from "dayjs";
import { Check, Loader2, MessageSquareOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
import type { ChatMessageRow } from "@/services";

export function ChatMessageTable({
  messages,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  messages: ChatMessageRow[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useInfiniteScrollSentinel(hasMore, onLoadMore, messages.length);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 p-4 rounded-2xl bg-muted/40 border border-border/50">
          <MessageSquareOff className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="font-['Manrope'] font-bold text-foreground text-sm mb-1">
          No messages to preview
        </p>
        <p className="text-xs font-['Inter'] text-muted-foreground max-w-xs">
          No readable content was found in this source.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div>
        <div className="h-[65vh] max-h-[calc(90dvh-12rem)] overflow-auto overscroll-contain [&>[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="h-11 border-b border-border/50 bg-muted px-3 text-xs font-['Manrope'] font-bold text-muted-foreground whitespace-nowrap w-[180px]">
                  Date & time
                </TableHead>
                <TableHead className="h-11 border-b border-border/50 bg-muted px-3 text-xs font-['Manrope'] font-bold text-muted-foreground whitespace-nowrap w-[160px]">
                  Sender
                </TableHead>
                <TableHead className="h-11 border-b border-border/50 bg-muted px-3 text-xs font-['Manrope'] font-bold text-muted-foreground">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.message_id} className="align-top border-border/30 transition-colors hover:bg-primary/[0.03]">
                  <TableCell className="px-3 py-2.5 text-xs text-muted-foreground font-['Inter'] whitespace-nowrap">
                    {dayjs(message.timestamp).locale("en").format("DD MMM YYYY, HH:mm")}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm font-['Manrope'] font-semibold text-foreground whitespace-nowrap">
                    {message.sender}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm font-['Inter'] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
                    {message.content}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
        </div>
      </div>

      <div className="flex min-h-10 items-center justify-between gap-2 border-t border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-['Inter']">
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
        <span className="shrink-0 whitespace-nowrap tabular-nums" aria-label={`${messages.length} of ${total} ${total === 1 ? "message" : "messages"} loaded`}>
          {messages.length.toLocaleString("en-US")} / {total.toLocaleString("en-US")} {total === 1 ? "message" : "messages"}
        </span>
      </div>
    </div>
  );
}
