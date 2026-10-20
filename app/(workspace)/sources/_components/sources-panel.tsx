"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { FileText, Link2, MessageCircle, Database } from "lucide-react";
import { SourcesTabRail } from "./sources-tab-rail";
import { useAuthStore } from "@/stores/auth-store";
import { useFilesTab } from "../_hooks/use-files-tab";
import { useSourceFolders } from "../_hooks/use-source-folders";
import { usePublicLinkTab } from "../_hooks/use-public-link-tab";
import { useTelegramTab } from "../_hooks/use-telegram-tab";
import { useDatabaseTab } from "../_hooks/use-database-tab";
import { FilesTab } from "./files/files-tab";
import { PublicLinkTab } from "./public-links/public-link-tab";
import { TelegramTab } from "./telegram/telegram-tab";
import { DatabaseTab } from "./database/database-tab";
import type { Tab, SourcesPanelProps } from "../_types/sources.type";
import { PAGE_CLASS } from "./sources-ui";

export function SourcesPanel({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  onPdfCollectionsChange,
  onChatCollectionsChange,
}: SourcesPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>("files");
  // The page scrolls inside this box, which keeps its offset when another tab is taller or shorter. Every tab starts
  // at the top, so the heading is never left half out of view.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  const filesTab = useFilesTab({ isAdmin, onPdfCollectionsChange, onChatCollectionsChange });
  const foldersTab = useSourceFolders();
  const publicLinkTab = usePublicLinkTab();
  const telegramTab = useTelegramTab({ isAdmin });
  const databaseTab = useDatabaseTab({ isAdmin });

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
  const allTabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "files", label: "Files", icon: <FileText /> },
    { id: "link", label: "Public Link", icon: <Link2 /> },
    { id: "chat", label: "Chat", icon: <MessageCircle />, adminOnly: true },
    { id: "database", label: "Database", icon: <Database />, adminOnly: true },
  ];
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-background [scrollbar-gutter:stable_both-edges]">
      <div className={PAGE_CLASS}>
        {/* Heading */}
        <div className="mb-[31px]">
          <h2 className="font-manrope text-[28px] font-extrabold leading-[1.2] tracking-[-0.75px] text-foreground">Sources</h2>
          <p className="mt-[7px] text-[15px] leading-normal text-muted-foreground">Manage all your knowledge sources</p>
        </div>

        {/* Tab bar */}
        <SourcesTabRail tabs={tabs} value={activeTab} onChange={setActiveTab} />

        <FilesTab tab={filesTab} folders={foldersTab} isAdmin={isAdmin} active={activeTab === "files"} />
        <PublicLinkTab tab={publicLinkTab} active={activeTab === "link"} />
        <TelegramTab tab={telegramTab} active={activeTab === "chat"} />
        <DatabaseTab tab={databaseTab} active={activeTab === "database"} />
      </div>
    </div>
  );
}
