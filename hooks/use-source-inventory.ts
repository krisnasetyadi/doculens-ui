"use client";

import { useCallback, useEffect, useState } from "react";
import { pdfCollectionsApi } from "@/services/pdf-collections/handler/pdf-collections.api";
import type { PdfCollection } from "@/services/pdf-collections/type/pdf-collection.type";
import { ChatCollectionApi } from "@/services/resources/chat-collection-api";
import { PublicLinkApi } from "@/services/resources/public-link-api";
import { DatabaseConnectionApi } from "@/services/resources/database-connection-api";
import type {
  ChatCollection,
  PublicLinkSource,
  PublicLinksResponse,
  DatabaseConnectionSource,
  DatabaseConnectionsResponse,
} from "@/services";
import { useWorkspaceStore } from "@/stores/workspace-store";

export type SourceKey = "pdf" | "db" | "chat" | "link";

interface SourceSummary {
  activeIds: string[];
  activeNames: string[];
  total: number;
}

const isActive = (status: string | undefined) => status !== "inactive";

/**
 * Single fetch point for "what sources exist and which are active" — shared
 * by the home hero chips and the chat toolbar so both always show the same
 * counts/names without duplicating four API calls per page.
 */
export function useSourceInventory() {
  const { sourceToggles, setSourceToggles } = useWorkspaceStore();

  const [pdfCollections, setPdfCollections] = useState<PdfCollection[]>([]);
  const [chatCollections, setChatCollections] = useState<ChatCollection[]>([]);
  const [chatInventoryLoaded, setChatInventoryLoaded] = useState(false);
  const [publicLinks, setPublicLinks] = useState<PublicLinkSource[]>([]);
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionSource[]>([]);

  const refetch = useCallback(() => {
    pdfCollectionsApi.list()
      .then(setPdfCollections)
      .catch(() => {});

    ChatCollectionApi.list<{ collections: ChatCollection[] } | ChatCollection[]>()
      .then((raw) => {
        setChatCollections(Array.isArray(raw) ? raw : raw.collections ?? []);
        setChatInventoryLoaded(true);
      })
      .catch(() => {});

    PublicLinkApi.list<PublicLinksResponse | PublicLinkSource[]>()
      .then((raw) => setPublicLinks(Array.isArray(raw) ? raw : raw.links ?? []))
      .catch(() => {});

    DatabaseConnectionApi.list<DatabaseConnectionsResponse | DatabaseConnectionSource[]>()
      .then((raw) => setDbConnections(Array.isArray(raw) ? raw : raw.connections ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const pdf: SourceSummary = {
    activeIds: pdfCollections.filter((c) => isActive(c.status)).map((c) => c.collection_id),
    activeNames: pdfCollections
      .filter((c) => isActive(c.status))
      .map((c) => c.title || c.file_names?.[0] || c.collection_id),
    total: pdfCollections.length,
  };

  const chat: SourceSummary = {
    activeIds: chatCollections.filter((c) => isActive(c.status)).map((c) => c.collection_id),
    activeNames: chatCollections
      .filter((c) => isActive(c.status))
      .map((c) => c.file_name || c.collection_id),
    total: chatCollections.length,
  };

  useEffect(() => {
    if (chatInventoryLoaded && chat.activeIds.length === 0 && sourceToggles.chat) {
      setSourceToggles({ chat: false });
    }
  }, [chatInventoryLoaded, chat.activeIds.length, sourceToggles.chat, setSourceToggles]);

  const link: SourceSummary = {
    activeIds: publicLinks.filter((l) => isActive(l.status)).map((l) => l.link_id),
    activeNames: publicLinks.filter((l) => isActive(l.status)).map((l) => l.title),
    total: publicLinks.length,
  };

  const db: SourceSummary = {
    activeIds: dbConnections.filter((c) => isActive(c.status)).map((c) => c.connection_id),
    activeNames: dbConnections.filter((c) => isActive(c.status)).map((c) => c.label),
    total: dbConnections.length,
  };

  const toggle = (key: SourceKey) => setSourceToggles({ [key]: !sourceToggles[key] });

  /** Switch to exactly one active source type, turning the other three off —
   * used by the suggested-question pills, which each imply "only this source". */
  const setActiveOnly = (key: SourceKey) =>
    setSourceToggles({ pdf: key === "pdf", db: key === "db", chat: key === "chat", link: key === "link" });

  return { toggles: sourceToggles, toggle, setActiveOnly, pdf, chat, link, db, refetch };
}

export type SourceInventory = ReturnType<typeof useSourceInventory>;
