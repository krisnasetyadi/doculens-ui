import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { optimisticUpdate } from "@/lib/query/optimistic-update";
import type {
  DatabaseConnectionSource,
  SetDatabaseConnectionActiveRequest,
} from "../type/database-connection.type";
import { databaseConnectionsApi } from "./database-connections.api";
import { databaseConnectionsKeys } from "./database-connections.keys";

export const databaseConnectionsQueries = {
  list: () =>
    queryOptions({
      queryKey: databaseConnectionsKeys.list(),
      queryFn: databaseConnectionsApi.list,
    }),
};

export const databaseConnectionsMutations = {
  create: () =>
    mutationOptions({
      mutationFn: databaseConnectionsApi.create,
      meta: { invalidates: [databaseConnectionsKeys.all] },
    }),

  /** Re-reads one connection's tables; the response replaces just that row in the list. */
  refreshTables: () =>
    mutationOptions({
      mutationFn: databaseConnectionsApi.tables,
      onSuccess: (updated, _connectionId, _onMutateResult, { client }) => {
        client.setQueryData<DatabaseConnectionSource[]>(databaseConnectionsKeys.list(), (connections) =>
          connections?.map((c) => (c.connection_id === updated.connection_id ? updated : c)),
        );
      },
    }),

  /** Flips the switch immediately; rolled back if the request fails. */
  activate: () =>
    mutationOptions({
      mutationFn: databaseConnectionsApi.activate,
      ...optimisticUpdate<DatabaseConnectionSource[], SetDatabaseConnectionActiveRequest>(
        databaseConnectionsKeys.list(),
        (connections, { connection_id, active }) =>
          connections.map((c) =>
            c.connection_id === connection_id ? { ...c, status: active ? "active" : "inactive" } : c,
          ),
      ),
      meta: { invalidates: [databaseConnectionsKeys.all] },
    }),

  delete: () =>
    mutationOptions({
      mutationFn: databaseConnectionsApi.delete,
      meta: { invalidates: [databaseConnectionsKeys.all] },
    }),
};
