import { queryOptions } from "@tanstack/react-query";
import { chatCollectionsApi } from "./chat-collections.api";
import { chatCollectionsKeys } from "./chat-collections.keys";

export const chatCollectionsQueries = {
  list: () =>
    queryOptions({
      queryKey: chatCollectionsKeys.list(),
      queryFn: chatCollectionsApi.list,
    }),
};
