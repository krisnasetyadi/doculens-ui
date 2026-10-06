import RequestHandler from "@/services/request-handler";
import type { DeleteResponse, StatusResponse } from "@/services/types";
import { DATABASE_CONNECTIONS_ENDPOINT } from "../endpoint";
import type {
  CreateDatabaseConnectionRequest,
  DatabaseConnectionSource,
  DatabaseConnectionsResponse,
  SetDatabaseConnectionActiveRequest,
} from "../type/database-connection.type";

const api = new RequestHandler(DATABASE_CONNECTIONS_ENDPOINT.BASE);

export const databaseConnectionsApi = {
  list: async (): Promise<DatabaseConnectionSource[]> => {
    const data = await api.get<DatabaseConnectionsResponse | DatabaseConnectionSource[]>();
    return Array.isArray(data) ? data : data.connections ?? [];
  },

  create: (body: CreateDatabaseConnectionRequest): Promise<DatabaseConnectionSource> =>
    api.store<DatabaseConnectionSource>(body),

  /** Re-reads the connection's table list and returns the updated connection. */
  tables: (connectionId: string): Promise<DatabaseConnectionSource> =>
    api.find<DatabaseConnectionSource>(
      `${encodeURIComponent(connectionId)}/${DATABASE_CONNECTIONS_ENDPOINT.TABLES}`,
    ),

  activate: (body: SetDatabaseConnectionActiveRequest): Promise<StatusResponse> =>
    api.storeAt<StatusResponse>(DATABASE_CONNECTIONS_ENDPOINT.ACTIVATE, body),

  delete: (connectionId: string): Promise<DeleteResponse> =>
    api.delete<DeleteResponse>(encodeURIComponent(connectionId)),
};
