export const chatCollectionsKeys = {
  all: ["chat-collections"] as const,
  list: () => [...chatCollectionsKeys.all, "list"] as const,
};
