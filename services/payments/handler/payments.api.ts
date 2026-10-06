import RequestHandler from "@/services/request-handler";
import { PAYMENTS_ENDPOINT } from "../endpoint";
import type {
  CheckoutSessionResponse,
  CreateCheckoutSessionRequest,
  PaymentResponse,
} from "../type/checkout.type";
import type { StorageUsage } from "../type/storage.type";
import type {
  MembersUsageResponse,
  MyMemberUsageResponse,
  RateLimitStatus,
  SubscriptionUsage,
  UpdateMemberAllocationRequest,
  UpdateMemberAllocationResponse,
  WorkspaceTokenSettings,
} from "../type/subscription.type";
import type {
  RequestMoreTokensRequest,
  TokenRequestResponse,
  TokenRequestsResponse,
} from "../type/token-request.type";

const api = new RequestHandler(PAYMENTS_ENDPOINT.BASE);

export const paymentsApi = {
  createCheckoutSession: (body: CreateCheckoutSessionRequest): Promise<CheckoutSessionResponse> =>
    api.storeAt<CheckoutSessionResponse>(PAYMENTS_ENDPOINT.CHECKOUT_SESSION, body),

  getSessionStatus: (sessionId: string): Promise<PaymentResponse> =>
    api.find<PaymentResponse>(`${PAYMENTS_ENDPOINT.SESSION}/${encodeURIComponent(sessionId)}`),

  getMyUsage: (): Promise<MyMemberUsageResponse> =>
    api.find<MyMemberUsageResponse>(PAYMENTS_ENDPOINT.SUBSCRIPTION_ME),

  getMembersUsage: (): Promise<MembersUsageResponse> =>
    api.find<MembersUsageResponse>(PAYMENTS_ENDPOINT.SUBSCRIPTION_MEMBERS),

  setMemberAllocation: (body: UpdateMemberAllocationRequest): Promise<UpdateMemberAllocationResponse> =>
    api.storeAt<UpdateMemberAllocationResponse>(PAYMENTS_ENDPOINT.SUBSCRIPTION_ALLOCATIONS, body),

  getTokenSettings: (): Promise<WorkspaceTokenSettings> =>
    api.find<WorkspaceTokenSettings>(PAYMENTS_ENDPOINT.SUBSCRIPTION_SETTINGS),

  updateTokenSettings: (body: WorkspaceTokenSettings): Promise<WorkspaceTokenSettings> =>
    api.update<WorkspaceTokenSettings>(PAYMENTS_ENDPOINT.SUBSCRIPTION_SETTINGS, body),

  cancelSubscription: (): Promise<SubscriptionUsage> =>
    api.storeAt<SubscriptionUsage>(PAYMENTS_ENDPOINT.SUBSCRIPTION_CANCEL, {}),

  resumeSubscription: (): Promise<SubscriptionUsage> =>
    api.storeAt<SubscriptionUsage>(PAYMENTS_ENDPOINT.SUBSCRIPTION_RESUME, {}),

  requestMoreTokens: (body: RequestMoreTokensRequest = {}): Promise<TokenRequestResponse> =>
    api.storeAt<TokenRequestResponse>(PAYMENTS_ENDPOINT.SUBSCRIPTION_REQUEST_MORE, body),

  listTokenRequests: (): Promise<TokenRequestsResponse> =>
    api.find<TokenRequestsResponse>(PAYMENTS_ENDPOINT.SUBSCRIPTION_REQUESTS),

  dismissTokenRequest: (requestId: string): Promise<TokenRequestResponse> =>
    api.storeAt<TokenRequestResponse>(
      `${PAYMENTS_ENDPOINT.SUBSCRIPTION_REQUESTS}/${encodeURIComponent(requestId)}/${PAYMENTS_ENDPOINT.DISMISS}`,
      {},
    ),

  getStorageUsage: (): Promise<StorageUsage> => api.find<StorageUsage>(PAYMENTS_ENDPOINT.STORAGE_USAGE),

  getRateLimitStatus: (): Promise<RateLimitStatus> =>
    api.find<RateLimitStatus>(PAYMENTS_ENDPOINT.RATE_LIMIT_ME),
};
