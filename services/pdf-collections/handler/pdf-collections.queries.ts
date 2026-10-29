import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { pdfCollectionsApi } from "./pdf-collections.api";
import { pdfCollectionsKeys } from "./pdf-collections.keys";

export const pdfCollectionsQueries = {
  list: () =>
    queryOptions({
      queryKey: pdfCollectionsKeys.list(),
      queryFn: pdfCollectionsApi.list,
    }),
  /** A text source's lines, 50 at a time like the Sources viewer; `slide` starts a deck at that slide. */
  textContent: (collectionId: string, fileName: string, slide?: number) =>
    infiniteQueryOptions({
      queryKey: pdfCollectionsKeys.textContent(collectionId, fileName, slide),
      queryFn: ({ pageParam }) =>
        pdfCollectionsApi.textContent({
          collectionId,
          fileName,
          offset: pageParam ?? 0,
          limit: 50,
          slide: pageParam === undefined ? slide : undefined,
        }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) => (last.has_more ? last.offset + last.lines.length : undefined),
    }),
};
