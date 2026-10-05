import RequestHandler from "@/services/request-handler";
import type { SourceUploadProgress, UploadSnapshot } from "@/services/upload-progress";
import type { DeleteResponse, MoveToFolderRequest, StatusResponse } from "@/services/types";
import { CHAT_COLLECTIONS_ENDPOINT } from "../endpoint";
import type {
  ChatCollection,
  ChatCollectionMessagesRequest,
  ChatCollectionMessagesResponse,
  ChatCollectionsResponse,
  ChatUploadResponse,
  SetChatCollectionActiveRequest,
} from "../type/chat-collection.type";

const api = new RequestHandler(CHAT_COLLECTIONS_ENDPOINT.BASE);

export const chatCollectionsApi = {
  list: async (): Promise<ChatCollection[]> => {
    const data = await api.get<ChatCollectionsResponse | ChatCollection[]>();
    return Array.isArray(data) ? data : data.collections ?? [];
  },

  /** Streams a stage + percent loading bar from the backend's NDJSON response
   * instead of waiting for the whole upload to finish (Sources panel — MS-553). */
  uploadSource: (
    body: FormData,
    onProgress: (update: SourceUploadProgress) => void,
  ): Promise<ChatUploadResponse> =>
    api.uploadSourceAt<ChatUploadResponse>(CHAT_COLLECTIONS_ENDPOINT.UPLOAD, body, onProgress),

  uploadStatus: (uploadId: string): Promise<UploadSnapshot> =>
    api.find<UploadSnapshot>(`${CHAT_COLLECTIONS_ENDPOINT.UPLOADS}/${encodeURIComponent(uploadId)}`),

  messages: ({
    collectionId,
    offset,
    limit,
  }: ChatCollectionMessagesRequest): Promise<ChatCollectionMessagesResponse> =>
    api.find<ChatCollectionMessagesResponse>(
      `${encodeURIComponent(collectionId)}/${CHAT_COLLECTIONS_ENDPOINT.MESSAGES}`,
      { offset, limit },
    ),

  activate: (body: SetChatCollectionActiveRequest): Promise<StatusResponse> =>
    api.storeAt<StatusResponse>(CHAT_COLLECTIONS_ENDPOINT.ACTIVATE, body),

  moveToFolder: (body: MoveToFolderRequest): Promise<StatusResponse> =>
    api.storeAt<StatusResponse>(CHAT_COLLECTIONS_ENDPOINT.MOVE_TO_FOLDER, body),

  delete: (collectionId: string): Promise<DeleteResponse> =>
    api.delete<DeleteResponse>(encodeURIComponent(collectionId)),
};
