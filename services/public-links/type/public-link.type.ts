export interface PublicLinkItem {
  id: string;
  name: string;
  url: string;
  item_type: "file" | "folder";
}

/** A file of a link left out of its index, and why (MS-907). */
export interface PublicLinkSkippedItem {
  name: string;
  url: string;
  reason: string;
}

export type PublicLinkIndexStatus = "pending" | "queued" | "indexing" | "ready" | "failed";

export interface PublicLinkSource {
  link_id: string;
  workspace_id?: string;
  title: string;
  url: string;
  status: "active" | "inactive";
  item_count: number;
  created_at: string;
  items: PublicLinkItem[];
  /** MS-907: the link is indexed once, in the background. `index_ready` says whether an index exists
   * to search; a rebuild that is running or failed keeps using the previous one. `index_stale`: a
   * build stopped reporting (cut off by a restart), so Sync may start it again. */
  index_status: PublicLinkIndexStatus;
  index_ready: boolean;
  index_stale: boolean;
  index_stage: string | null;
  index_progress: number | null;
  index_error: string | null;
  skipped_items: PublicLinkSkippedItem[];
  last_synced_at: string | null;
}

/** up_to_date: nothing in the folder changed. indexing: a rebuild was queued, or one already was. */
export interface PublicLinkSyncResponse {
  result: "up_to_date" | "indexing";
  link: PublicLinkSource;
}

export interface PublicLinksResponse {
  links: PublicLinkSource[];
  count: number;
}

export interface CreatePublicLinkRequest {
  title?: string;
  url: string;
  item_urls?: string[];
}

export interface SetPublicLinkActiveRequest {
  link_id: string;
  active: boolean;
}
