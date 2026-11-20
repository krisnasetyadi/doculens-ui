import type { TextContentAnchor } from "../type/pdf-collection.type";

export const pdfCollectionsKeys = {
  all: ["pdf-collections"] as const,
  list: () => [...pdfCollectionsKeys.all, "list"] as const,
  textContent: (
    collectionId: string,
    fileName: string,
    anchor: TextContentAnchor = {},
  ) =>
    [
      ...pdfCollectionsKeys.all,
      "text-content",
      collectionId,
      fileName,
      anchor.slide ?? null,
      anchor.section ?? null,
      anchor.sectionIndex ?? null,
      anchor.paragraph ?? null,
      anchor.sheet ?? null,
      anchor.row ?? null,
    ] as const,
};
