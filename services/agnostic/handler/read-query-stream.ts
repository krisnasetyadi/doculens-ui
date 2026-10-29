import type { HybridResponse } from "../../types";
import type { QueryStreamEvent, QueryStreamHandlers } from "../type/query-stream.type";

/** Follows the events of a streamed answer, passing the sources and every
 * piece of text to `handlers`, and resolves with the finished response.
 * Rejects when the backend reports a failure (`error`), or when the events
 * end without a finished answer. Throwing stops the iteration, which is what
 * cancels the response underneath. */
export async function followQueryStream(
  events: AsyncIterable<QueryStreamEvent>,
  handlers: QueryStreamHandlers,
): Promise<HybridResponse> {
  let result: HybridResponse | undefined;
  for await (const event of events) {
    switch (event.type) {
      case "sources":
        handlers.onSources(event);
        break;
      case "delta":
        handlers.onDelta(event.text);
        break;
      case "done":
        result = event.result;
        break;
      case "error":
        throw new Error(event.detail);
    }
  }
  if (!result) throw new Error("The answer was cut off before it was finished");
  return result;
}
