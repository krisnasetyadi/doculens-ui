// Legacy barrel, removed in Stage 5 (RULES.md: no barrels). API objects are
// NOT re-exported here; import each one directly by file path (e.g.
// "@/services/sessions/handler/sessions.api") to avoid barrel-import cost.
export * from "./endpoint";
export * from "./types";
export { default as RequestHandler } from "./request-handler";
