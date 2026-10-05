import RequestHandler from "@/services/request-handler";
import { SOURCE_FOLDERS_ENDPOINT } from "../endpoint";
import type {
  CreateFolderRequest,
  DeleteFolderResponse,
  Folder,
  UpdateFolderRequest,
} from "../type/source-folder.type";

const api = new RequestHandler(SOURCE_FOLDERS_ENDPOINT.BASE);

export const sourceFoldersApi = {
  list: async (): Promise<Folder[]> => {
    const data = await api.get<Folder[]>();
    return Array.isArray(data) ? data : [];
  },

  create: (body: CreateFolderRequest): Promise<Folder> => api.store<Folder>(body),

  update: (folderId: string, body: UpdateFolderRequest): Promise<Folder> =>
    api.update<Folder>(encodeURIComponent(folderId), body),

  delete: (folderId: string): Promise<DeleteFolderResponse> =>
    api.delete<DeleteFolderResponse>(encodeURIComponent(folderId)),
};
