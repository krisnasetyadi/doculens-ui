// ===================== AUTH / RBAC =====================

export type UserRole = "admin" | "user";

export interface AuthUser {
  user_id: string;
  email: string;
  name?: string;
  role: UserRole;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: UserRole;
}

// ===================== LLM MODELS =====================

export type LLMProvider = "huggingface" | "gemini";

export interface AvailableModelsResponse {
  default_provider: LLMProvider;
  default_model: string;
  available_models: Record<LLMProvider, string[]>;
  usage_hint: string;
}

export interface ModelSelection {
  provider: LLMProvider;
  model: string;
}

// ===================== REQUEST TYPES =====================

export interface HybridQueryRequest {
  question: string;
  collection_id?: string | null; // DEPRECATED: use pdf_collection_ids instead
  pdf_collection_ids?: string[] | null; // Specific PDF collections to search
  chat_collection_ids?: string[] | null; // Specific chat collections to search
  public_link_ids?: string[] | null; // Specific Public Link sources to search
  external_db_connection_ids?: string[] | null; // Specific database connections to search
  include_pdf_results?: boolean;
  /** @deprecated queries the app's own fixed DB, not a user-connected source */
  include_db_results?: boolean;
  include_chat_results?: boolean;
  include_public_links?: boolean;
  include_external_db?: boolean;
  source_mode?: "pdf" | "chat" | "database" | "public_link" | "mixed" | "none";
  llm_provider?: LLMProvider | null;
  llm_model?: string | null;
}

// ===================== RESPONSE TYPES =====================

export interface HealthResponse {
  status: string;
  initialized: boolean;
  pdf_collections_count: number;
  chat_collections_count: number;
}

export interface PdfSourceInfo {
  file_name: string;
  collection_id: string;
  page?: number;
  relevance_score?: number;
  content_preview?: string;
  file_url?: string;
  page_url?: string;
  search_text?: string; // Text snippet for highlighting in PDF viewer
}

export interface HybridResponse {
  answer: string;
  pdf_sources: string[];
  pdf_sources_detailed?: PdfSourceInfo[];
  db_results: Record<string, DbRecord[]>;
  chat_results?: ChatResult[];
  processing_time: number;
  search_terms: string[];
  target_tables?: string[];
  model_used: string;
}

export interface DbRecord {
  id: number;
  [key: string]: unknown;
}

export interface ChatResult {
  source: string;
  platform: string;
  participants: string;
  relevance_score: number;
  content_preview: string;
}

export interface UploadResponse {
  collection_id: string;
  file_count: number;
  status: string;
  file_names?: string[];
  title?: string;
}

export interface UploadFromUrlRequest {
  url: string;
  title?: string;
}

export interface UploadFromUrlsRequest {
  urls: string[];
  title?: string;
}

export interface DriveFolderItem {
  id: string;
  name: string;
  url: string;
  item_type: "file" | "folder";
}

export interface DriveFolderItemsResponse {
  folder_id: string;
  files: DriveFolderItem[];
  folders: DriveFolderItem[];
  count: number;
}

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

export interface PdfCollection {
  collection_id: string;
  document_count: number;
  created_at: string;
  file_names: string[];
  title?: string;
}

export interface ChatUploadResponse {
  collection_id: string;
  platform: string;
  message_count: number;
  file_name: string;
  date_range?: {
    start: string;
    end: string;
  };
  participants: string[];
}

export interface ChatCollection {
  collection_id: string;
  platform: string;
  file_name: string;
  message_count: number;
  date_range?: {
    start: string;
    end: string;
  };
  participants: string[];
  created_at: string;
}

export interface ChatCollectionPreviewResponse {
  collection_id: string;
  file_name: string;
  content_preview: string;
  truncated: boolean;
  max_chars: number;
}

export interface DeleteResponse {
  message: string;
}

// ===================== DATABASE CONNECTIONS =====================

export interface DbColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

export interface DbTableInfo {
  name: string;
  row_count?: number;
  columns: DbColumnInfo[];
}

export interface DatabaseConnectionSource {
  connection_id: string;
  workspace_id?: string;
  label: string;
  url: string; // password-redacted by the backend
  status: "active" | "inactive";
  table_count: number;
  created_at: string;
  tables: DbTableInfo[];
}

export interface DatabaseConnectionsResponse {
  connections: DatabaseConnectionSource[];
  count: number;
}

export interface CreateDatabaseConnectionRequest {
  label?: string;
  url: string;
}

export interface SetDatabaseConnectionActiveRequest {
  connection_id: string;
  active: boolean;
}

// ===================== CHAT SESSIONS =====================

export interface StoredMessageApi {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  created_at: string;
}

export interface SessionSummary {
  session_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  pdf_collections: string[];
  chat_collections: string[];
}

export interface SessionResponse {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: StoredMessageApi[];
  pdf_collections: string[];
  chat_collections: string[];
}

export interface UpsertSessionRequest {
  session_id?: string;
  title: string;
  messages: StoredMessageApi[];
  pdf_collections?: string[];
  chat_collections?: string[];
}
