import { ENDPOINT } from "@/services/endpoint";

export const PUBLIC_LINKS_ENDPOINT = {
  BASE: ENDPOINT.PUBLIC_LINKS,
  ACTIVATE: "activate",
  /** `${link_id}/sync` */
  SYNC: "sync",
} as const;
