export const databaseConnectionsKeys = {
  all: ["database-connections"] as const,
  list: () => [...databaseConnectionsKeys.all, "list"] as const,
};
