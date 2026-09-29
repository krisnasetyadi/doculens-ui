import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class FolderApiHandler {
  private api = new RequestHandler(ENDPOINT.SOURCE_FOLDERS);

  list<T>() {
    return this.api.get<T>();
  }

  create<T>(body: { name: string; parent_folder_id: string | null }) {
    return this.api.store<T>(body);
  }

  rename<T>(id: string, body: { name: string; parent_folder_id?: string | null }) {
    return this.api.update<T>(id, body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }
}

export const FolderApi = new FolderApiHandler();
