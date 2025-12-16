// ===================== LLM MODELS =====================

export type LLMProvider = "huggingface" | "ollama" | "gemini";

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
  collection_id?: string | null;
  include_pdf_results?: boolean;
  include_db_results?: boolean;
  include_chat_results?: boolean;
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
}

export interface PdfCollection {
  collection_id: string;
  document_count: number;
  created_at: string;
  file_names: string[];
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

export interface DeleteResponse {
  message: string;
}
