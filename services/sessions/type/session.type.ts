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
  // MS-417: present only when `q` matched inside a message and not in the
  // title — a title match is shown by highlighting the title instead. Plain
  // text (markdown already stripped server-side), safe to render as-is.
  matched_snippet?: string | null;
  matched_message_id?: string | null;
}

export interface SessionListParams {
  /** Search titles and message bodies (MS-417). */
  q?: string;
}

export interface SessionResponse {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: StoredMessageApi[];
  pdf_collections: string[];
  chat_collections: string[];
  // MS-237: set on the paginated GET only — POST (create/update) always
  // returns the full list it was given, so there's nothing more to page in.
  has_more: boolean;
  next_cursor: string | null;
  // Total user-authored messages in the session (loaded or not) — i.e. how
  // many chats it holds. ChatToc divides that total across its (max 5) bars,
  // so it can address questions that haven't been fetched yet.
  total_user_turns: number;
}

/** MS-237: one page of a session's messages, newest first. */
export interface SessionPageParams {
  limit: number;
  /** `next_cursor` from the previous page; omit for the newest page. */
  before?: string;
}

/** MS-237: the flat navigation index behind ChatToc's hover panel — every
 * question in the session, fetched once, independent of how much of the
 * thread itself has been paged in. */
export interface SessionQuestion {
  turn: number; // 1-based, from the start of the session
  message_id: string;
  preview: string;
}

export interface SessionQuestionsResponse {
  session_id: string;
  total: number;
  questions: SessionQuestion[];
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

export interface RenameSessionRequest {
  title: string;
}
