// ===================== AUTH / RBAC =====================

export type UserRole = "admin" | "user";

export interface AuthUser {
  user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: UserRole;
  name?: string;
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
}

export interface TeamMember {
  user_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TeamMembersResponse {
  members: TeamMember[];
  max_sub_users: number;
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
  status?: "active" | "inactive";
}

export interface SetPdfCollectionActiveRequest {
  collection_id: string;
  active: boolean;
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
  status?: "active" | "inactive";
}

export interface SetChatCollectionActiveRequest {
  collection_id: string;
  active: boolean;
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

// ===================== TELEGRAM CONNECTIONS =====================
// A live connection (Telethon login), not a file upload — api_id/api_hash
// are entered per-connection (from my.telegram.org/apps), not server config.

export interface TelegramConnectStartRequest {
  api_id: number;
  api_hash: string;
  phone: string;
  label?: string;
}

export interface TelegramConnectStartResponse {
  flow_id: string;
  phone: string;
}

export interface TelegramConnectVerifyRequest {
  flow_id: string;
  code: string;
  password?: string;
}

export interface TelegramConnectVerifyResponse {
  status: "connected" | "password_required";
  connection: TelegramConnectionSource | null;
}

export interface TelegramDialog {
  dialog_id: string;
  title: string;
  type: "user" | "group" | "channel";
  participants_count?: number;
}

export interface TelegramDialogsResponse {
  dialogs: TelegramDialog[];
  count: number;
}

export interface TelegramSelectedChat {
  dialog_id: string;
  title: string;
  type: string;
  chat_collection_id?: string;
  message_count?: number;
  status: "active" | "inactive";
  last_synced_at?: string;
}

export interface TelegramConnectionSource {
  connection_id: string;
  label: string;
  phone_masked: string;
  status: "active" | "inactive";
  created_at: string;
  selected_chats: TelegramSelectedChat[];
}

export interface TelegramConnectionsResponse {
  connections: TelegramConnectionSource[];
  count: number;
}

export interface TelegramSyncRequest {
  dialog_ids: string[];
  message_limit?: number;
}

export interface TelegramSyncResult {
  dialog_id: string;
  title: string;
  chat_collection_id: string;
  message_count: number;
  status: "success" | "error";
  error?: string;
}

export interface TelegramSyncResponse {
  results: TelegramSyncResult[];
}

export interface SetTelegramConnectionActiveRequest {
  connection_id: string;
  active: boolean;
}

// ===================== SKILL / GAP ANALYSIS =====================
// Generic "Reference Framework Gap Analysis" capability. `skill_id` selects
// behavior; ISO 27001 is just the first framework_name used with
// "compliance_gap_check" — nothing here is ISO-specific.

export type SkillId = "compliance_gap_check" | "scenario_regulatory_impact";
export type GapItemStatus = "met" | "partial" | "not_met" | "unknown";

export interface GapAnalysisRequest {
  skill_id: SkillId;
  reference_collection_ids: string[]; // array from day one — supports checking multiple frameworks in one run later
  framework_name: string;
  target_collection_ids: string[]; // required for compliance_gap_check — one guideline vs N files, verdict per file
  scenario_input?: string | null; // used by scenario_regulatory_impact instead of a target collection
}

export interface GapAnalysisItem {
  label: string;
  status: GapItemStatus;
  evidence?: string | null;
  source_citation?: string | null;
  recommendation?: string | null;
  target_collection_id?: string | null; // which target collection/file this item was checked against
}

export interface GapAnalysisRun {
  run_id: string;
  skill_id: SkillId;
  framework_name: string;
  reference_collection_ids: string[];
  target_collection_ids: string[];
  scenario_input?: string | null;
  status: string;
  created_at: string;
}

export interface GapAnalysisResponse {
  run: GapAnalysisRun;
  items: GapAnalysisItem[];
  summary: Record<GapItemStatus, number>;
  disclaimer?: string | null;
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
  // Omitted on every save after the first — the backend keeps whatever
  // title is already stored (auto-derived or since renamed) when this is
  // left out, so an in-progress chat doesn't stomp a rename on its next
  // message (MS-253).
  title?: string;
  messages: StoredMessageApi[];
  pdf_collections?: string[];
  chat_collections?: string[];
}

// ===================== PAYMENTS (dummy/test-mode Stripe — MS-90) =====================

export interface CheckoutSessionResponse {
  checkout_url: string;
  payment_id: string;
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled";

export interface PaymentRecord {
  payment_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

export interface PaymentResponse {
  payment: PaymentRecord;
}

export type SubscriptionStatus = "active" | "expired" | "none";

/** Workspace-level subscription + token usage for the current period.
 * Backend is the source of truth for every field here — the frontend
 * only renders them (MS-248). */
export interface SubscriptionUsage {
  plan_name: string;
  subscription_status: SubscriptionStatus;
  token_limit: number;
  token_used: number;
  token_remaining: number;
  period_start: string; // ISO date
  period_end: string; // ISO date
  next_reset_date: string | null;
  /** True once cancelled — access still runs until period_end (already
   * paid for), it just won't be treated as renewable after that. */
  cancel_at_period_end: boolean;
  /** False for the synthetic Free plan (nobody's paid) — hide cancel/resume
   * for it, there's no purchase on file to cancel. */
  is_paid: boolean;
}

/** One member's token allocation + consumption, carved out of the
 * workspace's SubscriptionUsage.token_limit by an admin. */
export interface MemberTokenUsage {
  user_id: string;
  email: string;
  allocated_tokens: number;
  used_tokens: number;
  remaining_tokens: number; // max(0, allocated_tokens - used_tokens)
  usage_percent: number; // used_tokens / allocated_tokens * 100 (0 if no allocation)
}

/** `null` when the workspace has no active subscription to allocate from. */
export interface MyMemberUsageResponse {
  usage: MemberTokenUsage | null;
}

export interface MembersUsageResponse {
  subscription: SubscriptionUsage | null;
  members: MemberTokenUsage[];
  unallocated_tokens: number;
}

export interface UpdateMemberAllocationRequest {
  user_id: string;
  allocated_tokens: number;
}

export interface UpdateMemberAllocationResponse {
  member: MemberTokenUsage;
  unallocated_tokens: number;
}

/** Flat, plan-independent safety-net rate limit — same cap/window for every
 * user, separate from the per-member monthly allocation above. Sliding
 * window: `used_tokens` covers just the last `window_hours`, so it clears
 * gradually rather than on a fixed daily clock. `reset_at` is null unless
 * `blocked` is true. */
export interface RateLimitStatus {
  used_tokens: number;
  cap_tokens: number;
  window_hours: number;
  blocked: boolean;
  reset_at: string | null;
}

/** "Request more tokens" (MS-248 follow-up) — in-app only (the admin sees
 * pending ones by polling /payments/subscription/requests, no real push
 * notification yet). A member who hit their admin-assigned cap can ask
 * for more; the admin raises it via the existing allocation editor, then
 * dismisses the request. */
export interface TokenRequestRecord {
  request_id: string;
  user_id: string;
  email: string;
  message: string | null;
  status: "pending" | "resolved";
  created_at: string;
}

export interface TokenRequestResponse {
  request: TokenRequestRecord;
}

export interface TokenRequestsResponse {
  requests: TokenRequestRecord[];
  pending_count: number;
}
