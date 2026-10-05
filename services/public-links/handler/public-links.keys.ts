export const publicLinksKeys = {
  all: ["public-links"] as const,
  list: () => [...publicLinksKeys.all, "list"] as const,
};
