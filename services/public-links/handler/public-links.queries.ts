import { queryOptions } from "@tanstack/react-query";
import { publicLinksApi } from "./public-links.api";
import { publicLinksKeys } from "./public-links.keys";

export const publicLinksQueries = {
  list: () =>
    queryOptions({
      queryKey: publicLinksKeys.list(),
      queryFn: publicLinksApi.list,
    }),
};
