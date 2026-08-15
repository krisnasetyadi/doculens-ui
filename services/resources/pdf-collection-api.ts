import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class PdfCollectionApiHandler {
  private api = new RequestHandler(ENDPOINT.PDF_COLLECTIONS);

  list<T>() {
    return this.api.get<T>();
  }

  upload<T>(body: FormData, params?: Record<string, unknown>) {
    return this.api.storeAt<T>("upload", body, params);
  }

  uploadFromUrl<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("upload-from-url", body);
  }

  uploadFromUrls<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("upload-from-urls", body);
  }

  driveFolderItems<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("drive/folder-items", body);
  }

  activate<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("activate", body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }
}

export const PdfCollectionApi = new PdfCollectionApiHandler();
