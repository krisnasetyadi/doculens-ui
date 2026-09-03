import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class PaymentApiHandler {
  private api = new RequestHandler(ENDPOINT.PAYMENTS);

  createCheckoutSession<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("checkout-session", body);
  }

  getSessionStatus<T>(sessionId: string) {
    return this.api.find<T>(`session/${sessionId}`);
  }

  getMyUsage<T>() {
    return this.api.find<T>("subscription/me");
  }

  getMembersUsage<T>() {
    return this.api.find<T>("subscription/members");
  }

  setMemberAllocation<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("subscription/allocations", body);
  }

  cancelSubscription<T>() {
    return this.api.storeAt<T>("subscription/cancel", {});
  }

  resumeSubscription<T>() {
    return this.api.storeAt<T>("subscription/resume", {});
  }

  getRateLimitStatus<T>() {
    return this.api.find<T>("rate-limit/me");
  }

  requestMoreTokens<T>(body: Record<string, unknown> = {}) {
    return this.api.storeAt<T>("subscription/request-more", body);
  }

  listTokenRequests<T>() {
    return this.api.find<T>("subscription/requests");
  }

  dismissTokenRequest<T>(requestId: string) {
    return this.api.storeAt<T>(`subscription/requests/${requestId}/dismiss`, {});
  }
}

export const PaymentApi = new PaymentApiHandler();
