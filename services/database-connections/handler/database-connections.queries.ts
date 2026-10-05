import { queryOptions } from "@tanstack/react-query";
import { databaseConnectionsApi } from "./database-connections.api";
import { databaseConnectionsKeys } from "./database-connections.keys";

export const databaseConnectionsQueries = {
  list: () =>
    queryOptions({
      queryKey: databaseConnectionsKeys.list(),
      queryFn: databaseConnectionsApi.list,
    }),
};
