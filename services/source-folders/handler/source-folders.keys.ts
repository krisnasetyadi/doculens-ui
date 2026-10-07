export const sourceFoldersKeys = {
  all: ["source-folders"] as const,
  list: () => [...sourceFoldersKeys.all, "list"] as const,
};
