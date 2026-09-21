import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class ChatCollectionApiHandler {
  private api = new RequestHandler(ENDPOINT.CHAT_COLLECTIONS);

  list<T>() {
    return this.api.get<T>();
  }

  upload<T>(body: FormData) {
    return this.api.storeAt<T>("upload", body);
  }

  preview<T>(id: string) {
    return this.api.find<T>(`${id}/preview?max_chars=20000`);
  }

  messages<T>(id: string, offset: number, limit: number) {
    return this.api.find<T>(`${id}/messages?offset=${offset}&limit=${limit}`);
  }

  activate<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("activate", body);
  }

  moveToFolder<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("move-to-folder", body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }
}

export const ChatCollectionApi = new ChatCollectionApiHandler();
