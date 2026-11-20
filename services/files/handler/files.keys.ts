export const filesKeys = {
  all: ["files"] as const,
  document: (collectionId: string, fileName: string) => [...filesKeys.all, "document", collectionId, fileName] as const,
};
