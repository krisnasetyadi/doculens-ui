"use client";

import { useCallback, useEffect, useState } from "react";
import { PdfCollectionApi } from "@/services/resources/pdf-collection-api";
import { ChatCollectionApi } from "@/services/resources/chat-collection-api";
import { PublicLinkApi } from "@/services/resources/public-link-api";
import { DatabaseConnectionApi } from "@/services/resources/database-connection-api";
import type {
  PdfCollection,
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
  const [publicLinks, setPublicLinks] = useState<PublicLinkSource[]>([]);
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionSource[]>([]);

  const refetch = useCallback(() => {
    PdfCollectionApi.list<PdfCollection[]>()
      .then((data) => setPdfCollections(Array.isArray(data) ? data : []))
      .catch(() => {});

    ChatCollectionApi.list<{ collections: ChatCollection[] } | ChatCollection[]>()
      .then((raw) => setChatCollections(Array.isArray(raw) ? raw : raw.collections ?? []))
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

  return { toggles: sourceToggles, toggle, pdf, chat, link, db, refetch };
}

export type SourceInventory = ReturnType<typeof useSourceInventory>;
