import RequestHandler from "@/services/request-handler";
import type { DeleteResponse, StatusResponse } from "@/services/types";
import { PUBLIC_LINKS_ENDPOINT } from "../endpoint";
import type {
  CreatePublicLinkRequest,
  PublicLinkSource,
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

  delete: (linkId: string): Promise<DeleteResponse> =>
    api.delete<DeleteResponse>(encodeURIComponent(linkId)),
};
