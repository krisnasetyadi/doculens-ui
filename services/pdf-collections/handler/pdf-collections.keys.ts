export const pdfCollectionsKeys = {
  all: ["pdf-collections"] as const,
  list: () => [...pdfCollectionsKeys.all, "list"] as const,
};
