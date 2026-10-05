import RequestHandler from "@/services/request-handler";
import type { SourceUploadProgress, UploadSnapshot } from "@/services/upload-progress";
import type { DeleteResponse, MoveToFolderRequest, StatusResponse } from "@/services/types";
import { PDF_COLLECTIONS_ENDPOINT } from "../endpoint";
import type {
  PdfCollection,
  PdfCollectionTextContentRequest,
  PdfCollectionTextContentResponse,
  SetPdfCollectionActiveRequest,
} from "../type/pdf-collection.type";
import type { PdfPersistMode, UploadFromUrlsRequest, UploadResponse } from "../type/upload.type";

const api = new RequestHandler(PDF_COLLECTIONS_ENDPOINT.BASE);

export const pdfCollectionsApi = {
  list: async (): Promise<PdfCollection[]> => {
    const data = await api.get<PdfCollection[]>();
    return Array.isArray(data) ? data : [];
  },

  /** Streams a stage + percent loading bar from the backend's NDJSON response
   * instead of waiting for the whole upload to finish (Sources panel — MS-553). */
  uploadSource: (
    body: FormData,
    persistMode: PdfPersistMode,
    onProgress: (update: SourceUploadProgress) => void,
  ): Promise<UploadResponse> =>
    api.uploadSourceAt<UploadResponse>(PDF_COLLECTIONS_ENDPOINT.UPLOAD, body, onProgress, {
      persist_mode: persistMode,
    }),

  uploadStatus: (uploadId: string): Promise<UploadSnapshot> =>
    api.find<UploadSnapshot>(`${PDF_COLLECTIONS_ENDPOINT.UPLOADS}/${encodeURIComponent(uploadId)}`),

  uploadFromUrls: (body: UploadFromUrlsRequest): Promise<UploadResponse> =>
    api.storeAt<UploadResponse>(PDF_COLLECTIONS_ENDPOINT.UPLOAD_FROM_URLS, body),

  activate: (body: SetPdfCollectionActiveRequest): Promise<StatusResponse> =>
    api.storeAt<StatusResponse>(PDF_COLLECTIONS_ENDPOINT.ACTIVATE, body),

  moveToFolder: (body: MoveToFolderRequest): Promise<StatusResponse> =>
    api.storeAt<StatusResponse>(PDF_COLLECTIONS_ENDPOINT.MOVE_TO_FOLDER, body),

  textContent: ({
    collectionId,
    fileName,
    offset,
    limit,
  }: PdfCollectionTextContentRequest): Promise<PdfCollectionTextContentResponse> =>
    api.find<PdfCollectionTextContentResponse>(
      `${encodeURIComponent(collectionId)}/${PDF_COLLECTIONS_ENDPOINT.TEXT_CONTENT}`,
      { file_name: fileName, offset, limit },
    ),

  delete: (collectionId: string): Promise<DeleteResponse> => api.delete<DeleteResponse>(collectionId),
};
