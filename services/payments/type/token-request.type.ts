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

export interface RequestMoreTokensRequest {
  message?: string;
}

export interface TokenRequestResponse {
  request: TokenRequestRecord;
}

export interface TokenRequestsResponse {
  requests: TokenRequestRecord[];
  pending_count: number;
}
