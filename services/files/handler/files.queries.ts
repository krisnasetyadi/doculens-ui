import { queryOptions } from "@tanstack/react-query";
import { filesApi } from "./files.api";
import { filesKeys } from "./files.keys";

export const filesQueries = {
  /** A document's bytes, e.g. a PDF a gap analysis finding points into. */
  document: (collectionId: string, fileName: string) =>
    queryOptions({
      queryKey: filesKeys.document(collectionId, fileName),
      queryFn: () => filesApi.document({ collectionId, fileName }),
    }),
};
