import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class DatabaseConnectionApiHandler {
  private api = new RequestHandler(ENDPOINT.DATABASE_CONNECTIONS);

  list<T>() {
    return this.api.get<T>();
  }

  create<T>(body: Record<string, unknown>) {
    return this.api.store<T>(body);
  }

  tables<T>(id: string) {
    return this.api.find<T>(`${id}/tables`);
  }

  activate<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("activate", body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }
}

export const DatabaseConnectionApi = new DatabaseConnectionApiHandler();
