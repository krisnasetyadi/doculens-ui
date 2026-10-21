import type { ChatResult, HybridResponse, PdfSourceInfo } from "../../types";

/** What the backend has found for a question, sent before the answer starts
 * (the `sources` event of `POST /agnostic/query?stream=true`). */
export interface QuerySources {
  pdf_sources: string[];
  pdf_sources_detailed?: PdfSourceInfo[];
  chat_results?: ChatResult[];
  source_type: string;
  retrieved_count: number;
}

/** One line of the streamed answer: `sources`, then a `delta` per piece of
 * text, then `done` with the finished response (the same body a plain POST
 * returns, and the text that replaces what was streamed), or `error`. */
export type QueryStreamEvent =
  | ({ type: "sources" } & QuerySources)
  | { type: "delta"; text: string }
  | { type: "done"; result: HybridResponse }
  | { type: "error"; detail: string };

export interface QueryStreamHandlers {
  onSources: (sources: QuerySources) => void;
  onDelta: (text: string) => void;
}
