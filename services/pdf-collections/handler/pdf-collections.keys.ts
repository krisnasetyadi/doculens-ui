export const pdfCollectionsKeys = {
  all: ["pdf-collections"] as const,
  list: () => [...pdfCollectionsKeys.all, "list"] as const,
  textContent: (
    collectionId: string,
    fileName: string,
    anchor: { slide?: number; section?: string | null; paragraph?: number; sheet?: string; row?: number } = {},
  ) =>
    [
      ...pdfCollectionsKeys.all,
      "text-content",
      collectionId,
      fileName,
      anchor.slide ?? null,
      anchor.section ?? null,
      anchor.paragraph ?? null,
      anchor.sheet ?? null,
      anchor.row ?? null,
    ] as const,
};
