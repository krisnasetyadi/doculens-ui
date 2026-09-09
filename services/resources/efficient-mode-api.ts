import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

/** MS-247 "Efficient Mode" — kept as its own tiny resource file (rather
 * than a method on PaymentApi, even though the backend route lives under
 * the payments router) so the whole experiment can be deleted by removing
 * this one file plus its call site, without touching payment-api.ts. */
class EfficientModeApiHandler {
  private api = new RequestHandler(ENDPOINT.PAYMENTS);

  getMyStats<T>() {
    return this.api.find<T>("efficient-mode/stats");
  }
}

export const EfficientModeApi = new EfficientModeApiHandler();
