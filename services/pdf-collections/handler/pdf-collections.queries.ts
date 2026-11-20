import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { pdfCollectionsApi } from "./pdf-collections.api";
import { pdfCollectionsKeys } from "./pdf-collections.keys";
import type { TextContentAnchor } from "../type/pdf-collection.type";

export const pdfCollectionsQueries = {
  list: () =>
    queryOptions({
      queryKey: pdfCollectionsKeys.list(),
      queryFn: pdfCollectionsApi.list,
    }),
  /** A text source's lines, 50 at a time like the Sources viewer. `anchor` opens the first page at a
   * deck's slide, a Word paragraph or a spreadsheet row; later pages follow on from there. */
  textContent: (collectionId: string, fileName: string, anchor: TextContentAnchor = {}) =>
    infiniteQueryOptions({
      queryKey: pdfCollectionsKeys.textContent(collectionId, fileName, anchor),
      queryFn: ({ pageParam }) =>
        pdfCollectionsApi.textContent({
          collectionId,
          fileName,
          offset: pageParam ?? 0,
          limit: 50,
          ...(pageParam === undefined ? anchor : {}),
        }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) => (last.has_more ? last.offset + last.lines.length : undefined),
    }),
};
