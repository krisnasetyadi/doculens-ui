import { ENDPOINT } from "@/services/endpoint";

export const SESSIONS_ENDPOINT = {
  BASE: ENDPOINT.SESSIONS,
  QUESTIONS: "questions",
} as const;
