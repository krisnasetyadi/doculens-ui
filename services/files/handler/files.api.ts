import { getAuthHeader } from "@/lib/auth-token";
import RequestHandler from "@/services/request-handler";
import { FILES_ENDPOINT } from "../endpoint";

const api = new RequestHandler(FILES_ENDPOINT.BASE);

/** Backend file download links (`GET /files/{collection_id}/{file_name}`) come
 * back from the API as absolute URLs, so they are fetched as-is rather than
 * through a RequestHandler base path. */
export const filesApi = {
  /** The file's bytes, fetched with the Authorization header a plain link can't send. */
  getBlob: async (fileUrl: string): Promise<Blob> => {
    const res = await fetch(fileUrl, { headers: getAuthHeader() });
    if (!res.ok) throw new Error(`Failed to open file (${res.status})`);
    return res.blob();
  },

  /** A document's bytes by collection and file name, for callers that hold a pointer rather than a
   * link (a gap analysis finding, MS-1112). */
  document: ({ collectionId, fileName }: { collectionId: string; fileName: string }): Promise<Blob> =>
    api.findBlob(`${encodeURIComponent(collectionId)}/${encodeURIComponent(fileName)}`),
};
