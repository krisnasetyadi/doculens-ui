export interface DbColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

export interface DbTableInfo {
  name: string;
  row_count?: number;
  columns: DbColumnInfo[];
}

export interface DatabaseConnectionSource {
  connection_id: string;
  workspace_id?: string;
  label: string;
  url: string; // password-redacted by the backend
  status: "active" | "inactive";
  table_count: number;
  created_at: string;
  tables: DbTableInfo[];
}

export interface DatabaseConnectionsResponse {
  connections: DatabaseConnectionSource[];
  count: number;
}

export interface CreateDatabaseConnectionRequest {
  label?: string;
  url: string;
}

export interface SetDatabaseConnectionActiveRequest {
  connection_id: string;
  active: boolean;
}
