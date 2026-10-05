import { queryOptions } from "@tanstack/react-query";
import { pdfCollectionsApi } from "./pdf-collections.api";
import { pdfCollectionsKeys } from "./pdf-collections.keys";

export const pdfCollectionsQueries = {
  list: () =>
    queryOptions({
      queryKey: pdfCollectionsKeys.list(),
      queryFn: pdfCollectionsApi.list,
    }),
};
