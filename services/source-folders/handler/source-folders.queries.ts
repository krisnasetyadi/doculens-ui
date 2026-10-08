import { queryOptions } from "@tanstack/react-query";
import { sourceFoldersApi } from "./source-folders.api";
import { sourceFoldersKeys } from "./source-folders.keys";

export const sourceFoldersQueries = {
  list: () =>
    queryOptions({
      queryKey: sourceFoldersKeys.list(),
      queryFn: sourceFoldersApi.list,
    }),
};
