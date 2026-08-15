"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { SessionsApi } from "@/services/resources/sessions-api";
import type { SessionSummary } from "@/services";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";
import { EmptyState } from "@/components/sources-panel";
import { Card, CardContent } from "@/components/ui/card";

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
  const { toast } = useToast();
  const bumpSessionsVersion = useWorkspaceStore((s) => s.bumpSessionsVersion);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);

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

  const handleDelete = (session: SessionSummary) => {
    setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
    SessionsApi.delete(session.session_id)
      .then(() => bumpSessionsVersion())
      .catch(() => {
        setSessions((prev) =>
          prev.some((s) => s.session_id === session.session_id) ? prev : [...prev, session],
        );
        toast({
          title: "Couldn't delete conversation",
          description: `"${session.title}" is still there — check your connection and try again.`,
          variant: "destructive",
        });
      });
  };

  const handleClearAll = async () => {
    setClearing(true);
    const toDelete = sessions;
    const results = await Promise.allSettled(
      toDelete.map((s) => SessionsApi.delete(s.session_id)),
    );
    const failed = toDelete.filter((_, i) => results[i].status === "rejected");
    setSessions(failed);
    setClearing(false);
    if (failed.length < toDelete.length) bumpSessionsVersion();
    if (failed.length > 0) {
      toast({
        title: "Some conversations weren't cleared",
        description: `${failed.length} of ${toDelete.length} conversations couldn't be deleted. Try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="font-['Manrope'] text-2xl font-extrabold text-foreground">
              History
            </h2>
            <p className="font-['Inter'] text-muted-foreground text-sm mt-1">
              {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              className="p-2 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh from server"
              aria-label="Refresh from server"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {sessions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs font-['Manrope'] font-bold text-muted-foreground hover:text-destructive gap-1.5"
                    disabled={clearing}
                  >
                    {clearing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Clear all
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-['Manrope'] font-extrabold">Clear all conversations?</AlertDialogTitle>
                    <AlertDialogDescription className="font-['Inter']">
                      This deletes all {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}. You
                      can&apos;t undo this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
                    >
                      Clear all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Search */}
        {sessions.length > 0 && (
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              className="w-full bg-card border border-border rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] pl-10 pr-4 py-2.5 text-sm font-['Inter'] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
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
            <span className="text-sm font-['Inter']">Loading conversations…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <EmptyState
            icon={<Clock className="h-14 w-14 text-muted-foreground/30" />}
            heading="No conversations yet"
            label="Start a new inquiry and your conversations will be saved here automatically."
            onUpload={() => router.push("/home")}
            uploadLabel="New Inquiry"
            uploadIcon={<Plus className="h-4 w-4" />}
            ctaVariant="primary"
          />
        )}

        {/* No search results */}
        {sessions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
            <div className="mb-3 p-5 rounded-2xl bg-muted/40 border border-border/50">
              <Search className="h-10 w-10" />
            </div>
            <p className="font-['Manrope'] font-bold text-foreground/60">
              No results for &ldquo;{search}&rdquo;
            </p>
          </div>
        )}

        {/* Session groups */}
        {grouped.length > 0 && (
        <Card className="rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <CardContent className="space-y-6">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-primary font-['Manrope'] mb-2 px-1">
                {label}
              </p>
              <div className="divide-y divide-border/60">
                {items.map((session) => {
                  const replyCount = Math.floor((session.message_count ?? 0) / 2);
                  const pdfCols = session.pdf_collections ?? [];
                  return (
                    <div
                      key={session.session_id}
                      className="group flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer relative"
                      onClick={() => router.push(`/ask?session_id=${session.session_id}`)}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold font-['Manrope'] text-foreground truncate mb-1">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(session);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
