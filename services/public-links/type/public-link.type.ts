export interface PublicLinkItem {
  id: string;
  name: string;
  url: string;
  item_type: "file" | "folder";
}

export interface PublicLinkSource {
  link_id: string;
  workspace_id?: string;
  title: string;
  url: string;
  status: "active" | "inactive";
  item_count: number;
  created_at: string;
  items: PublicLinkItem[];
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
