import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Loader2, Plus, Send, Trash2, ChevronRight, ChevronDown, RefreshCw, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chatCollectionsApi } from "@/services/chat-collections/handler/chat-collections.api";
import type { PlainTextLineRow } from "@/services";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { EmptyState } from "@/components/empty-state";
import { SourceConnectionSkeleton } from "../source-connection-skeleton";
import { PlainTextViewerTable } from "../plain-text-viewer-table";
import type { useTelegramTab } from "../../_hooks/use-telegram-tab";
import {
  CARD_CLASS,
  TOOLBAR_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
  CONNECTION_HEAD_CLASS,
  ROW_PANEL_CLASS,
  DIALOG_TITLE_CLASS,
} from "@/lib/sources-ui";
import { DANGER_ICON_BUTTON_CLASS } from "@/lib/danger-styles";

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
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-[95vw] grid-cols-1 overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="min-w-0 text-left">
          <DialogTitle className={`${DIALOG_TITLE_CLASS} truncate`}>Telegram messages: {title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Loading preview…</div>
        ) : error ? (
          <p className="py-8 text-xs text-destructive">Preview unavailable. Sync this chat again, then retry.</p>
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
      <div className={CARD_CLASS}>
        {loadingTelegramConnections ? (
          <SourceConnectionSkeleton />
        ) : telegramConnections.length === 0 ? (
          <EmptyState
            icon={<MessageCircle />}
            heading="Your chats will show up here"
            label="Connect Telegram to pull existing chat history in as a live, re-syncable source"
            uploadLabel="Connect Telegram"
            uploadIcon={<Send className="size-3.5" />}
            onUpload={() => {
              setTelegramDialogConnection(null);
              setTelegramDialogOpen(true);
            }}
          />
        ) : (
          <>
            <div className={TOOLBAR_CLASS}>
              <p className="mr-auto font-['Manrope'] text-[13px] font-bold text-foreground">
                {telegramConnections.length} connection{telegramConnections.length !== 1 ? "s" : ""}
              </p>
              <Button
                onClick={() => {
                  setTelegramDialogConnection(null);
                  setTelegramDialogOpen(true);
                }}
                className={PRIMARY_BUTTON_CLASS}
              >
                <Plus className="size-3.5" />
                Connect Telegram
              </Button>
            </div>
            <div>
              {telegramConnections.map((conn) => {
                const isActive = conn.status === "active";
                const isExpanded = expandedTelegramConnections.has(conn.connection_id);
                return (
                  <div key={conn.connection_id} className="border-b last:border-b-0">
                    <div
                      className={CONNECTION_HEAD_CLASS}
                      onClick={() => toggleTelegramConnectionExpansion(conn.connection_id)}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                        <Send className="size-[18px] text-sky-500 dark:text-sky-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={ROW_TITLE_CLASS}>
                          {conn.label}
                        </p>
                        <p className={ROW_META_CLASS}>
                          {conn.phone_masked} · {conn.selected_chats.length} chat{conn.selected_chats.length !== 1 ? "s" : ""}{isActive ? "" : " · Inactive"}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className={ROW_PANEL_CLASS}>
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="text-[11px] text-muted-foreground">
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
                              className={`size-7 rounded-md ${DANGER_ICON_BUTTON_CLASS}`}
                              aria-label="Delete connection"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {conn.selected_chats.length === 0 ? (
                          <p className="px-1 py-2 text-[11px] text-muted-foreground">
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
                                  className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                                >
                                  {collectionId && !syncing ? (
                                    <button
                                      onClick={() => setPreviewTarget({ collectionId, title: sc.title })}
                                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left font-['Manrope'] text-xs font-medium text-foreground transition-colors hover:text-primary focus:outline-none"
                                      title={`Preview ${sc.title}`}
                                    >
                                      <span className="truncate flex-1 min-w-0">{sc.title}</span>
                                      <Eye className="size-3 shrink-0 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
                                    </button>
                                  ) : (
                                    <span className="min-w-0 flex-1 truncate font-['Manrope'] text-xs font-medium">{sc.title}</span>
                                  )}
                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {sc.message_count ?? 0} messages
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={syncing}
                                    onClick={() => syncTelegramChats(conn.connection_id, [sc.dialog_id])}
                                    className="h-7 shrink-0 gap-1 rounded-lg bg-card text-[11px] font-semibold"
                                  >
                                    {syncing ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="size-3" />
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
                          className={SECONDARY_BUTTON_CLASS}
                        >
                          <Plus className="size-3.5" />
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
