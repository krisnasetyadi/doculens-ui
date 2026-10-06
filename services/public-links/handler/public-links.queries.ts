import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { optimisticUpdate } from "@/lib/query/optimistic-update";
import type { PublicLinkSource, SetPublicLinkActiveRequest } from "../type/public-link.type";
import { publicLinksApi } from "./public-links.api";
import { publicLinksKeys } from "./public-links.keys";

export const publicLinksQueries = {
  list: () =>
    queryOptions({
      queryKey: publicLinksKeys.list(),
      queryFn: publicLinksApi.list,
    }),
};

export const publicLinksMutations = {
  create: () =>
    mutationOptions({
      mutationFn: publicLinksApi.create,
      meta: { invalidates: [publicLinksKeys.all] },
    }),

  /** Flips the switch immediately; rolled back if the request fails. */
  activate: () =>
    mutationOptions({
      mutationFn: publicLinksApi.activate,
      ...optimisticUpdate<PublicLinkSource[], SetPublicLinkActiveRequest>(
        publicLinksKeys.list(),
        (links, { link_id, active }) =>
          links.map((link) =>
            link.link_id === link_id ? { ...link, status: active ? "active" : "inactive" } : link,
          ),
      ),
      meta: { invalidates: [publicLinksKeys.all] },
    }),

  delete: () =>
    mutationOptions({
      mutationFn: publicLinksApi.delete,
      meta: { invalidates: [publicLinksKeys.all] },
    }),
};
