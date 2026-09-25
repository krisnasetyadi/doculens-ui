import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";
import type { SourceUploadProgress, UploadSnapshot } from "../upload-progress";

class PdfCollectionApiHandler {
  private api = new RequestHandler(ENDPOINT.PDF_COLLECTIONS);

  list<T>() {
    return this.api.get<T>();
  }

  upload<T>(body: FormData, params?: Record<string, unknown>) {
    return this.api.storeAt<T>("upload", body, params);
  }

  /** Same upload, but streams a loading-bar progress instead of waiting for
   * the whole thing to finish (Sources panel — MS-553). */
  uploadSource<T>(body: FormData, params: Record<string, unknown>, onProgress: (update: SourceUploadProgress) => void) {
    return this.api.uploadSourceAt<T>("upload", body, onProgress, params);
  }

  uploadStatus<T = UploadSnapshot>(uploadId: string) {
    return this.api.find<T>(`uploads/${encodeURIComponent(uploadId)}`);
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

  textContent<T>(id: string, fileName: string, offset: number, limit: number) {
    return this.api.find<T>(
      `${id}/text-content?file_name=${encodeURIComponent(fileName)}&offset=${offset}&limit=${limit}`,
    );
  }

  moveToFolder<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("move-to-folder", body);
  }

  delete<T>(id: string) {
    return this.api.delete<T>(id);
  }
}

export const PdfCollectionApi = new PdfCollectionApiHandler();
