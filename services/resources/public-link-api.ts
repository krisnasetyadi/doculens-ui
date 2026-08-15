import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class PublicLinkApiHandler {
  private api = new RequestHandler(ENDPOINT.PUBLIC_LINKS);

  list<T>() {
    return this.api.get<T>();
  }

  create<T>(body: Record<string, unknown>) {
    return this.api.store<T>(body);
  }

  activate<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("activate", body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }
}

export const PublicLinkApi = new PublicLinkApiHandler();
