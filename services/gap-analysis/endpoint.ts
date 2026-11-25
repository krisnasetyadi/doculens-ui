import { ENDPOINT } from "@/services/endpoint";

export const GAP_ANALYSIS_ENDPOINT = {
  BASE: ENDPOINT.GAP_ANALYSIS,
  RUNS: "runs",
  EXPORT: "export",
  SETUP_SUGGEST: "setup/suggest",
  SETUP_DRAFT: "setup/draft",
  ANALYSES: "analyses",
} as const;
