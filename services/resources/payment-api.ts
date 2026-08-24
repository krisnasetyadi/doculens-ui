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
}

export const PaymentApi = new PaymentApiHandler();
