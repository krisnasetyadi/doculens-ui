import { ENDPOINT } from "@/services/endpoint";

export const GAP_ANALYSIS_ENDPOINT = {
  BASE: ENDPOINT.GAP_ANALYSIS,
  RUNS: "runs",
  EXPORT: "export",
  ITEMS: "items",
  CORRECTION: "correction",
} as const;
