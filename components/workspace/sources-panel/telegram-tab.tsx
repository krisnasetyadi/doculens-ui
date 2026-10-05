import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Loader2, Plus, Send, Trash2, ChevronRight, ChevronDown, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chatCollectionsApi } from "@/services/chat-collections/handler/chat-collections.api";
import type { PlainTextLineRow } from "@/services";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { EmptyState } from "./empty-state";
import { SourceConnectionSkeleton } from "./source-connection-skeleton";
import { PlainTextViewerTable } from "./plain-text-viewer-table";
import type { useTelegramTab } from "@/hooks/use-telegram-tab";

const TELEGRAM_PREVIEW_PAGE_SIZE = 100;

function TelegramPreviewDialog({ collectionId, title, onClose }: { collectionId: string; title: string; onClose: () => void }) {
  const [lines, setLines] = useState<PlainTextLineRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    chatCollectionsApi.messages({ collectionId, offset: 0, limit: TELEGRAM_PREVIEW_PAGE_SIZE })
      .then((data) => {
        if (!mounted.current) return;
        setLines(data.lines || []);
        setTotal(data.total);
        setHasMore(data.has_more);
      })
      .catch(() => {
        if (mounted.current) setError(true);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => { mounted.current = false; };
  }, [collectionId]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    chatCollectionsApi.messages({ collectionId, offset: lines.length, limit: TELEGRAM_PREVIEW_PAGE_SIZE })
      .then((data) => {
        if (!mounted.current) return;
        setLines((current) => [...current, ...(data.lines || [])]);
        setTotal(data.total);
        setHasMore(data.has_more);
      })
      .catch(() => {
        if (mounted.current) setError(true);
      })
      .finally(() => {
        if (mounted.current) setLoadingMore(false);
      });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="grid-cols-1 max-h-[90dvh] max-w-[95vw] w-[95vw] overflow-y-auto rounded-2xl border-border/60 bg-card shadow-xl sm:max-w-3xl">
        <DialogHeader className="min-w-0 text-left">
          <DialogTitle className="truncate">Telegram messages: {title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading preview…</div>
        ) : error ? (
          <p className="py-8 text-sm text-destructive">Preview unavailable. Sync this chat again, then retry.</p>
        ) : (
          <PlainTextViewerTable lines={lines} total={total} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TelegramTab({ tab, active }: { tab: ReturnType<typeof useTelegramTab>; active: boolean }) {
  const [previewTarget, setPreviewTarget] = useState<{ collectionId: string; title: string } | null>(null);
  const {
    telegramConnections,
    loadingTelegramConnections,
    expandedTelegramConnections,
    syncingTelegramChats,
    telegramDialogOpen,
    setTelegramDialogOpen,
    telegramDialogConnection,
    setTelegramDialogConnection,
    fetchTelegramConnections,
    toggleTelegramConnectionExpansion,
    toggleTelegramConnectionActive,
    deleteTelegramConnection,
    syncTelegramChats,
  } = tab;

  return (
    <>
      {active && (
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
        {loadingTelegramConnections ? (
          <SourceConnectionSkeleton />
        ) : telegramConnections.length === 0 ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-5xl leading-none">chat_bubble</span>}
            label="Connect Telegram to pull existing chat history in as a live, re-syncable source"
            uploadLabel="Connect Telegram"
            uploadIcon={<Send className="h-4 w-4" />}
            onUpload={() => {
              setTelegramDialogConnection(null);
              setTelegramDialogOpen(true);
            }}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground font-['Inter']">
                {telegramConnections.length} connection{telegramConnections.length !== 1 ? "s" : ""}
              </p>
              <Button
                onClick={() => {
                  setTelegramDialogConnection(null);
                  setTelegramDialogOpen(true);
                }}
                className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs sm:shrink-0"
              >
                <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                Connect Telegram
              </Button>
            </div>
            <div className="space-y-3">
              {telegramConnections.map((conn) => {
                const isActive = conn.status === "active";
                const isExpanded = expandedTelegramConnections.has(conn.connection_id);
                return (
                  <div key={conn.connection_id} className="relative rounded-xl bg-card border border-border/60 overflow-hidden">
                    <span
                      className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    />
                    <div
                      className="flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                      onClick={() => toggleTelegramConnectionExpansion(conn.connection_id)}
                    >
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-sky-500/10">
                        <Send className="h-4 w-4 text-sky-500 dark:text-sky-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate">
                          {conn.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                          {conn.phone_masked} · {conn.selected_chats.length} chat{conn.selected_chats.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border/60 bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="text-xs text-muted-foreground font-['Inter']">
                            Connected {dayjs(conn.created_at).format("DD MMM YYYY, HH:mm")}
                          </p>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={isActive}
                              onCheckedChange={(checked) => toggleTelegramConnectionActive(conn.connection_id, checked)}
                              aria-label={isActive ? "Deactivate connection" : "Activate connection"}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteTelegramConnection(conn.connection_id)}
                              className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {conn.selected_chats.length === 0 ? (
                          <p className="px-1 py-2 text-xs text-muted-foreground/60 font-['Inter']">
                            No chats synced yet — add some below.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {conn.selected_chats.map((sc) => {
                              const syncKey = `${conn.connection_id}:${sc.dialog_id}`;
                              const syncing = syncingTelegramChats.has(syncKey);
                              const collectionId = sc.chat_collection_id;
                              return (
                                <div
                                  key={sc.dialog_id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-card border border-border/60 group"
                                >
                                  {collectionId && !syncing ? (
                                    <button
                                      onClick={() => setPreviewTarget({ collectionId, title: sc.title })}
                                      className="flex-1 min-w-0 text-sm font-medium font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
                                      title={`Preview ${sc.title}`}
                                    >
                                      <span className="truncate flex-1 min-w-0">{sc.title}</span>
                                      <Eye className="h-3 w-3 shrink-0 inline opacity-0 group-hover:opacity-70 transition-opacity text-primary" />
                                    </button>
                                  ) : (
                                    <span className="flex-1 min-w-0 text-sm font-medium font-['Manrope'] truncate">{sc.title}</span>
                                  )}
                                  <span className="text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60 shrink-0">
                                    {sc.message_count ?? 0} messages
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={syncing}
                                    onClick={() => syncTelegramChats(conn.connection_id, [sc.dialog_id])}
                                    className="h-7 text-[11px] font-['Manrope'] font-semibold gap-1 shrink-0"
                                  >
                                    {syncing ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3" />
                                    )}
                                    Sync
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTelegramDialogConnection(conn);
                            setTelegramDialogOpen(true);
                          }}
                          className="h-8 text-xs font-['Manrope'] font-semibold gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add more chats
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      )}

      <TelegramConnectDialog
        open={telegramDialogOpen}
        onOpenChange={setTelegramDialogOpen}
        existingConnection={telegramDialogConnection}
        onDone={() => fetchTelegramConnections()}
      />
      {previewTarget && (
        <TelegramPreviewDialog
          key={previewTarget.collectionId}
          collectionId={previewTarget.collectionId}
          title={previewTarget.title}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </>
  );
}
