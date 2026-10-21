import { readNdjson } from "@/lib/ndjson";
import { HybridQueryApi } from "../../resources/hybrid-query-api";
import type { HybridQueryRequest, HybridResponse } from "../../types";
import type { QueryStreamEvent, QueryStreamHandlers } from "../type/query-stream.type";
import { followQueryStream } from "./read-query-stream";

const isNdjson = (response: Response) =>
  response.headers.get("content-type")?.includes("application/x-ndjson") ?? false;

export const agnosticApi = {
  /** Asks a question and receives the answer as it is written (MS-906).
   * `signal` ends it at once: the backend stops the model and the promise
   * rejects with an AbortError. Resolves with the finished response, the same
   * one a plain POST returns. A backend that does not stream answers with that
   * response straight away. */
  streamQuery: async (
    request: HybridQueryRequest,
    handlers: QueryStreamHandlers,
    signal: AbortSignal,
  ): Promise<HybridResponse> => {
    const response = await HybridQueryApi.storeRaw(request, { stream: true }, { signal });
    if (!isNdjson(response)) return (await response.json()) as HybridResponse;
    return followQueryStream(readNdjson<QueryStreamEvent>(response), handlers);
  },
};
