"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { SessionsApi } from "@/services";
import type { SessionSummary } from "@/services";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

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

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchSessions = () => {
    setLoading(true);
    SessionsApi.get<SessionSummary[]>()
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = groupByDate(
    [...filtered].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  );

  const handleDelete = (id: string) => {
    SessionsApi.delete(id).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.session_id !== id));
  };

  const handleClearAll = () => {
    sessions.forEach((s) => SessionsApi.delete(s.session_id).catch(() => {}));
    setSessions([]);
    setConfirmClear(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-8 pt-10 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="font-[''Manrope''] text-3xl font-extrabold text-foreground tracking-tight mb-1">
              History
            </h2>
            <div className="flex items-center gap-2">
              <p className="font-[''Inter''] text-muted-foreground text-sm">
                {sessions.length} conversation{sessions.length !== 1 ? "s" : ""} · synced
              </p>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-[''Inter''] font-semibold">
                backend
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              className="p-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh from server"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {sessions.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-[''Inter'']">Clear all?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs font-[''Manrope'']"
                    onClick={handleClearAll}
                  >
                    Yes, clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-[''Manrope'']"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-[''Manrope''] text-muted-foreground hover:text-destructive gap-1.5"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </Button>
              ))}
          </div>
        </div>

        {/* Search */}
        {sessions.length > 0 && (
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-[''Inter''] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Loading */}
        {loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground/50">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-[''Inter'']">Loading conversations…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">
              <Clock className="h-14 w-14 text-muted-foreground/30" />
            </div>
            <p className="font-[''Manrope''] font-bold text-foreground text-lg mb-2">
              No conversations yet
            </p>
            <p className="text-sm font-[''Inter''] text-muted-foreground text-center max-w-xs mb-6">
              Start a new inquiry and your conversations will be saved here automatically.
            </p>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-[''Manrope''] font-semibold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)]"
              onClick={() => router.push("/home")}
            >
              <span className="material-symbols-outlined text-base leading-none">add</span>
              New Inquiry
            </Button>
          </div>
        )}

        {/* No search results */}
        {sessions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
            <Search className="h-10 w-10 mb-3" />
            <p className="font-[''Manrope''] font-semibold text-foreground/60">
              No results for &ldquo;{search}&rdquo;
            </p>
          </div>
        )}

        {/* Session groups */}
        <div className="space-y-8">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50 font-[''Manrope''] mb-3 px-1">
                {label}
              </p>
              <div className="space-y-2">
                {items.map((session) => {
                  const replyCount = Math.floor((session.message_count ?? 0) / 2);
                  const pdfCols = session.pdf_collections ?? [];
                  return (
                    <div
                      key={session.session_id}
                      className="group flex items-start gap-3 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer relative"
                      onClick={() => router.push(`/ask?session_id=${session.session_id}`)}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-[''Manrope''] text-foreground truncate mb-1">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground/50 font-[''Inter'']">
                            {dayjs(session.updated_at).fromNow()}
                          </span>
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-[''Inter'']">
                            {replyCount} {replyCount === 1 ? "reply" : "replies"}
                          </span>
                          {pdfCols.length > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-[''Inter'']">
                              {pdfCols.length} PDF
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(session.session_id);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
