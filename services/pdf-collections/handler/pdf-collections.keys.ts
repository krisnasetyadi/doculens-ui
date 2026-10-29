export const pdfCollectionsKeys = {
  all: ["pdf-collections"] as const,
  list: () => [...pdfCollectionsKeys.all, "list"] as const,
  textContent: (collectionId: string, fileName: string, slide?: number) =>
    [...pdfCollectionsKeys.all, "text-content", collectionId, fileName, slide ?? null] as const,
};
