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
  name?: string;
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
  /** Omitted → the workspace's Default Token Allocation (MS-402). */
  allocated_tokens?: number;
}

export interface TeamMember {
  user_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  name?: string | null;
  created_at: string;
  /** Only on the create response (MS-402): the token cap actually granted,
   * and whether it was reduced to fit what was left of the pool. */
  allocated_tokens?: number | null;
  allocation_clamped?: boolean;
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
  // MS-237: which session this question belongs to, plus the previous 5
  // messages — lets the LLM resolve a follow-up like "ringkas semua di atas"
  // instead of answering the question in isolation.
  session_id?: string | null;
  memory?: MemoryTurn[];
  // MS-252: one-shot skill invocation — the Skill (see Skill/SkillApi below)
  // whose `instruction` should shape this one answer. Cleared client-side
  // right after this request is sent, so it never lingers onto the next.
  skill_id?: string | null;
  // MS-247 "Efficient Mode" — opt-in, caveman-inspired context-compression
  // experiment. Defaults to false/absent server-side, so omitting this is
  // identical to sending false.
  efficient_mode?: boolean;
}

export interface MemoryTurn {
  role: "user" | "assistant";
  content: string;
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
  // MS-247 "Efficient Mode" — present only when efficient_mode was
  // requested and the answer actually went through the LLM/context-build
  // branch (absent for system short-circuit answers).
  efficiency?: EfficiencyStats;
}

/** Per-message before/after comparison for the "Efficient Mode" popup. */
export interface EfficiencyStats {
  enabled: boolean;
  raw_chars: number;
  final_chars: number;
  raw_tokens_est: number;
  final_tokens_est: number;
  reduction_pct: number;
  parts_before?: number;
  parts_after?: number;
  deduplicated_chunks?: number;
  sections_pruned?: number;
  memory_turns_deduplicated?: number;
}

/** Aggregate stats for the Settings > Efficient Mode mini-dashboard. */
export interface EfficientModeStats {
  queries_tested: number;
  avg_reduction_pct: number;
  total_raw_tokens_est: number;
  total_final_tokens_est: number;
  total_tokens_saved_est: number;
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

// ===================== SHARED ACROSS DOMAINS =====================

/** Shared by pdf-collections and chat-collections `move-to-folder`. */
export interface MoveToFolderRequest {
  collection_id: string;
  folder_id: string | null;
}

/** One numbered line of a plain-text viewer (pdf-collections text content,
 * chat-collections messages). */
export interface PlainTextLineRow {
  line_number: number;
  content: string;
}

export interface DeleteResponse {
  message: string;
}

/** Body returned by activate / move-to-folder style endpoints across domains. */
export interface StatusResponse {
  status: string;
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
  /** Legacy field; the backend now syncs the complete available history. */
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

// ===================== SKILLS =====================

export type SkillScope = "personal" | "team";

export interface Skill {
  skill_id: string;
  name: string;
  slash_command: string;
  description: string;
  instruction: string;
  scope: SkillScope;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface SkillCreateRequest {
  name: string;
  slash_command: string;
  description?: string;
  instruction: string;
  scope?: SkillScope;
}

export type SkillUpdateRequest = Partial<SkillCreateRequest>;
