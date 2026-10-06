import { ENDPOINT } from "@/services/endpoint";

export const DATABASE_CONNECTIONS_ENDPOINT = {
  BASE: ENDPOINT.DATABASE_CONNECTIONS,
  ACTIVATE: "activate",
  TABLES: "tables",
} as const;
