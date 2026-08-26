"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useFilesTab } from "@/hooks/use-files-tab";
import { usePublicLinkTab } from "@/hooks/use-public-link-tab";
import { useTelegramTab } from "@/hooks/use-telegram-tab";
import { useDatabaseTab } from "@/hooks/use-database-tab";
import { FilesTab } from "./files-tab";
import { PublicLinkTab } from "./public-link-tab";
import { TelegramTab } from "./telegram-tab";
import { DatabaseTab } from "./database-tab";
import type { Tab, SourcesPanelProps } from "./sources-types";

export { EmptyState } from "./empty-state";

export function SourcesPanel({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  onPdfCollectionsChange,
  onChatCollectionsChange,
  onPublicLinkIdsChange,
  onDbConnectionIdsChange,
}: SourcesPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>("files");

  const filesTab = useFilesTab({ isAdmin, onPdfCollectionsChange, onChatCollectionsChange });
  const publicLinkTab = usePublicLinkTab({ onPublicLinkIdsChange });
  const telegramTab = useTelegramTab({ isAdmin });
  const databaseTab = useDatabaseTab({ isAdmin, onDbConnectionIdsChange });

  // Active chat sources for the query context come from two places:
  // WhatsApp uploads (Files tab) and Telegram-synced chats (Telegram tab).
  // This lives at the composition root because it's the one piece of state
  // that genuinely depends on both tabs at once.
  useEffect(() => {
    const whatsappActive = filesTab.chatFiles
      .filter((f) => f.collectionId && f.active !== false)
      .map((f) => f.collectionId!);
    const telegramActive = telegramTab.telegramConnections
      .filter((c) => c.status === "active")
      .flatMap((c) => c.selected_chats)
      .filter((sc) => sc.chat_collection_id && sc.status === "active")
      .map((sc) => sc.chat_collection_id!);
    onChatCollectionsChange?.([...whatsappActive, ...telegramActive]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesTab.chatFiles, telegramTab.telegramConnections]);

  // ── Tab config ───────────────────────────────────────────────────────────
  // Database and Chat are admin-only sources (enforced server-side too —
  // this is defense-in-depth, not the actual access control).
  const allTabs: { id: Tab; label: string; shortLabel?: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "files", label: "Files", icon: <span className="material-symbols-outlined text-[18px] leading-none">description</span> },
    { id: "link", label: "Public Link", shortLabel: "Links", icon: <span className="material-symbols-outlined text-[18px] leading-none">link</span> },
    { id: "chat", label: "Chat", icon: <span className="material-symbols-outlined text-[18px] leading-none">chat_bubble</span>, adminOnly: true },
    { id: "database", label: "Database", icon: <span className="material-symbols-outlined text-[18px] leading-none">database</span>, adminOnly: true },
  ];
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="h-full overflow-y-auto bg-background [scrollbar-gutter:stable]">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-['Manrope'] text-2xl font-extrabold text-foreground">
            Sources
          </h2>
          <p className="font-['Inter'] text-muted-foreground text-sm mt-1">
            Manage all your knowledge sources
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-muted/60 border border-border/50 p-1 rounded-xl w-full sm:w-fit mb-8 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-5 py-2 rounded-xl font-['Manrope'] font-bold text-sm transition-all",
                activeTab === t.id
                  ? "bg-card shadow-sm text-primary border border-border/60"
                  : "text-muted-foreground hover:text-foreground border border-transparent",
              )}
            >
              {t.icon}
              <span className="sm:hidden">{t.shortLabel ?? t.label}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <FilesTab tab={filesTab} isAdmin={isAdmin} active={activeTab === "files"} />
        <PublicLinkTab tab={publicLinkTab} active={activeTab === "link"} />
        <TelegramTab tab={telegramTab} active={activeTab === "chat"} />
        <DatabaseTab tab={databaseTab} active={activeTab === "database"} />
      </div>
    </div>
  );
}
