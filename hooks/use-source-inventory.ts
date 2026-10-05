"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { pdfCollectionsQueries } from "@/services/pdf-collections/handler/pdf-collections.queries";
import { chatCollectionsQueries } from "@/services/chat-collections/handler/chat-collections.queries";
import { publicLinksQueries } from "@/services/public-links/handler/public-links.queries";
import { databaseConnectionsQueries } from "@/services/database-connections/handler/database-connections.queries";
import { useWorkspaceStore } from "@/stores/workspace-store";

export type SourceKey = "pdf" | "db" | "chat" | "link";

interface SourceSummary {
  activeIds: string[];
  activeNames: string[];
  total: number;
}

const isActive = (status: string | undefined) => status !== "inactive";

function summarize<T extends { status?: string }>(
  items: T[],
  getId: (item: T) => string,
  getName: (item: T) => string,
): SourceSummary {
  const active = items.filter((item) => isActive(item.status));
  return { activeIds: active.map(getId), activeNames: active.map(getName), total: items.length };
}

// Sources mutations do not invalidate these queries yet (Stage 4), so refetch
// on every mount like before; concurrent mounts still share one request.
const INVENTORY_QUERY_OPTIONS = { refetchOnMount: "always" } as const;

/**
 * Single source for "what sources exist and which are active" — shared by the
 * home hero chips and the chat toolbar. Both read the same query cache, so they
 * always show the same counts/names without duplicating the four requests.
 */
export function useSourceInventory() {
  const { sourceToggles, setSourceToggles } = useWorkspaceStore();

  const pdfQuery = useQuery({ ...pdfCollectionsQueries.list(), ...INVENTORY_QUERY_OPTIONS });
  const chatQuery = useQuery({ ...chatCollectionsQueries.list(), ...INVENTORY_QUERY_OPTIONS });
  const linkQuery = useQuery({ ...publicLinksQueries.list(), ...INVENTORY_QUERY_OPTIONS });
  const dbQuery = useQuery({ ...databaseConnectionsQueries.list(), ...INVENTORY_QUERY_OPTIONS });

  const pdf = summarize(
    pdfQuery.data ?? [],
    (c) => c.collection_id,
    (c) => c.title || c.file_names?.[0] || c.collection_id,
  );
  const chat = summarize(
    chatQuery.data ?? [],
    (c) => c.collection_id,
    (c) => c.file_name || c.collection_id,
  );
  const link = summarize(linkQuery.data ?? [], (l) => l.link_id, (l) => l.title);
  const db = summarize(dbQuery.data ?? [], (c) => c.connection_id, (c) => c.label);

  // The chat toggle is meaningless with no active chat collection; switch it off
  // once the list has actually loaded (not while it is still empty-by-default).
  const chatLoaded = chatQuery.isSuccess;
  useEffect(() => {
    if (chatLoaded && chat.activeIds.length === 0 && sourceToggles.chat) {
      setSourceToggles({ chat: false });
    }
  }, [chatLoaded, chat.activeIds.length, sourceToggles.chat, setSourceToggles]);

  const toggle = (key: SourceKey) => setSourceToggles({ [key]: !sourceToggles[key] });

  /** Switch to exactly one active source type, turning the other three off —
   * used by the suggested-question pills, which each imply "only this source". */
  const setActiveOnly = (key: SourceKey) =>
    setSourceToggles({ pdf: key === "pdf", db: key === "db", chat: key === "chat", link: key === "link" });

  return { toggles: sourceToggles, toggle, setActiveOnly, pdf, chat, link, db };
}

export type SourceInventory = ReturnType<typeof useSourceInventory>;
