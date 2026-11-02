import RequestHandler from "@/services/request-handler";
import type { DeleteResponse, StatusResponse } from "@/services/types";
import { PUBLIC_LINKS_ENDPOINT } from "../endpoint";
import type {
  CreatePublicLinkRequest,
  PublicLinkSource,
  PublicLinkSyncResponse,
  PublicLinksResponse,
  SetPublicLinkActiveRequest,
} from "../type/public-link.type";

const api = new RequestHandler(PUBLIC_LINKS_ENDPOINT.BASE);

export const publicLinksApi = {
  list: async (): Promise<PublicLinkSource[]> => {
    const data = await api.get<PublicLinksResponse | PublicLinkSource[]>();
    return Array.isArray(data) ? data : data.links ?? [];
  },

  create: async (body: CreatePublicLinkRequest): Promise<PublicLinkSource> => {
    const data = await api.store<{ link: PublicLinkSource } | PublicLinkSource>(body);
    return "link" in data ? data.link : data;
  },

  activate: (body: SetPublicLinkActiveRequest): Promise<StatusResponse> =>
    api.storeAt<StatusResponse>(PUBLIC_LINKS_ENDPOINT.ACTIVATE, body),

  /** Lists the link again and rebuilds its index only if its files changed. */
  sync: (linkId: string): Promise<PublicLinkSyncResponse> =>
    api.storeAt<PublicLinkSyncResponse>(`${encodeURIComponent(linkId)}/${PUBLIC_LINKS_ENDPOINT.SYNC}`, {}),

  delete: (linkId: string): Promise<DeleteResponse> =>
    api.delete<DeleteResponse>(encodeURIComponent(linkId)),
};
