import RequestHandler from "@/services/request-handler";
import type { DeleteResponse } from "@/services/types";
import { SESSIONS_ENDPOINT } from "../endpoint";
import type {
  RenameSessionRequest,
  SessionListParams,
  SessionPageParams,
  SessionQuestionsResponse,
  SessionResponse,
  SessionSummary,
  UpsertSessionRequest,
} from "../type/session.type";

const api = new RequestHandler(SESSIONS_ENDPOINT.BASE);

export const sessionsApi = {
  list: async (params?: SessionListParams): Promise<SessionSummary[]> => {
    const data = await api.get<SessionSummary[]>(params?.q ? { q: params.q } : undefined);
    return Array.isArray(data) ? data : [];
  },

  get: (sessionId: string, { limit, before }: SessionPageParams): Promise<SessionResponse> =>
    api.find<SessionResponse>(encodeURIComponent(sessionId), before ? { limit, before } : { limit }),

  questions: (sessionId: string): Promise<SessionQuestionsResponse> =>
    api.find<SessionQuestionsResponse>(
      `${encodeURIComponent(sessionId)}/${SESSIONS_ENDPOINT.QUESTIONS}`,
    ),

  /** Creates the session when `session_id` is absent, otherwise saves into it. */
  upsert: (body: UpsertSessionRequest): Promise<SessionResponse> => api.store<SessionResponse>(body),

  rename: (sessionId: string, body: RenameSessionRequest): Promise<SessionSummary> =>
    api.update<SessionSummary>(encodeURIComponent(sessionId), body),

  delete: (sessionId: string): Promise<DeleteResponse> =>
    api.delete<DeleteResponse>(encodeURIComponent(sessionId)),
};
