import type { PlainTextLineRow } from "@/services/types";

interface DateRange {
  start: string;
  end: string;
}

export interface ChatCollection {
  collection_id: string;
  platform: string;
  file_name: string;
  message_count: number;
  date_range?: DateRange;
  participants: string[];
  created_at: string;
  status?: "active" | "inactive";
  folder_id?: string;
}

export interface ChatCollectionsResponse {
  collections: ChatCollection[];
  count: number;
}

export interface ChatUploadResponse {
  collection_id: string;
  platform: string;
  message_count: number;
  file_name: string;
  date_range?: DateRange;
  participants: string[];
}

export interface SetChatCollectionActiveRequest {
  collection_id: string;
  active: boolean;
}

export interface ChatCollectionMessagesRequest {
  collectionId: string;
  offset: number;
  limit: number;
}

export interface ChatMessageRow {
  message_id: string;
  sender: string;
  timestamp: string;
  content: string;
  raw_line: string;
}

export interface ChatCollectionMessagesResponse {
  subtype: "whatsapp" | "plain_text";
  lines: PlainTextLineRow[];
  collection_id: string;
  file_name: string;
  platform: string;
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  messages: ChatMessageRow[];
}
