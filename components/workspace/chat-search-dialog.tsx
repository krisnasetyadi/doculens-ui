"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { ChevronRight, Loader2, MessageSquare, Search, XIcon } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SessionsApi } from "@/services/resources/sessions-api";
import type { SessionSummary } from "@/services";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Same grouping used by the History page (app/(workspace)/history/page.tsx) —
// kept as a local copy rather than a shared import so this component doesn't
// create a dependency on that page's module.
function groupByDate(sessions: SessionSummary[]) {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const d = dayjs(s.updated_at);
    let label: string;
    if (d.isToday()) label = "Today";
    else if (d.isYesterday()) label = "Yesterday";
    else if (dayjs().diff(d, "day") < 7) label = "This week";
    else if (dayjs().diff(d, "day") < 30) label = "This month";
    else label = d.format("MMMM YYYY");
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(s);
  }
  const order = ["Today", "Yesterday", "This week", "This month"];
  const groups: { label: string; items: SessionSummary[] }[] = [];
  for (const label of order) {
    if (map.has(label)) groups.push({ label, items: map.get(label)! });
  }
  for (const [label, items] of map.entries()) {
    if (!order.includes(label)) groups.push({ label, items });
  }
  return groups;
}

/** Search across historical chats — opened from the search icon in the
 * sidebar's logo row (MS-89). Calls `GET /sessions?q=` (MS-254), which
 * matches against session title OR any message content server-side, not
 * just the title. Query is debounced; the very first fetch on open (empty
 * query) fires immediately. */
export function ChatSearchDialog({ open, onOpenChange }: ChatSearchDialogProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const requestSeq = useRef(0);
  const hasLoadedRef = useRef(false);

  // Clear the query on close so reopening always starts from a blank search.
  useEffect(() => {
    if (!open) {
      setQuery("");
      hasLoadedRef.current = false;
    }
  }, [open]);

  // Fetch on open, then re-fetch (debounced) as the query changes.
  useEffect(() => {
    if (!open) return;
    const seq = ++requestSeq.current;
    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad) setInitialLoading(true);
    else setSearching(true);

    const timer = setTimeout(() => {
      SessionsApi.get<SessionSummary[]>(query ? { q: query } : undefined)
        .then((data) => {
          if (seq !== requestSeq.current) return; // a newer request superseded this one
          setSessions(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          setSessions([]);
        })
        .finally(() => {
          if (seq !== requestSeq.current) return;
          hasLoadedRef.current = true;
          setInitialLoading(false);
          setSearching(false);
        });
    }, isFirstLoad ? 0 : 300);

    return () => clearTimeout(timer);
  }, [open, query]);

  const grouped = groupByDate(
    [...sessions].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    ),
  );

  function openSession(sessionId: string) {
    onOpenChange(false);
    router.push(`/ask?session_id=${sessionId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 flex flex-col max-w-[min(720px,calc(100%-2rem))] sm:max-w-[min(720px,calc(100%-2rem))] w-full h-[min(640px,82vh)] overflow-hidden rounded-2xl bg-card border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
      >
        <DialogTitle className="sr-only">Search conversations</DialogTitle>

        {/* Close lives inline in this row (not DialogContent's default
           absolute top-4 right-4) so it's vertically centered against the
           search input instead of floating at a fixed offset above it. Same
           XIcon/behavior as every other dialog's close button. Input itself
           is copied from the real search bar on the History page — same
           box, shadow, and placeholder color, not the generic shadcn Input. */}
        <div className="shrink-0 flex items-center gap-2 pl-5 pr-4 pt-5 pb-4">
          <div className="relative flex-1">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            )}
            <input
              autoFocus
              className="w-full bg-card border border-border rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] pl-10 pr-4 py-2.5 text-sm font-['Inter'] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <DialogClose className="shrink-0 rounded-xs p-1.5 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden">
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {initialLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-['Inter']">Loading conversations…</span>
            </div>
          ) : sessions.length === 0 && !query.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground/40">
              <div className="mb-3 p-5 rounded-2xl bg-muted/40 border border-border/50">
                <MessageSquare className="h-10 w-10" />
              </div>
              <p className="font-['Manrope'] font-bold text-foreground/60 text-sm">No conversations yet</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground/40">
              <div className="mb-3 p-5 rounded-2xl bg-muted/40 border border-border/50">
                <Search className="h-10 w-10" />
              </div>
              <p className="font-['Manrope'] font-bold text-foreground/60 text-sm">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-primary font-['Manrope'] mb-2 px-2">
                    {label}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((session) => {
                      const replyCount = Math.floor((session.message_count ?? 0) / 2);
                      const pdfCols = session.pdf_collections ?? [];
                      return (
                        <button
                          key={session.session_id}
                          type="button"
                          onClick={() => openSession(session.session_id)}
                          className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold font-['Manrope'] text-foreground truncate">
                              {session.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground/50 font-['Inter']">
                                {dayjs(session.updated_at).fromNow()}
                              </span>
                              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-['Inter']">
                                {replyCount} {replyCount === 1 ? "reply" : "replies"}
                              </span>
                              {pdfCols.length > 0 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-['Inter']">
                                  {pdfCols.length} PDF
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
