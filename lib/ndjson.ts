/** Splits a stream of text into NDJSON lines (one JSON value per line). A
 * chunk can end in the middle of a line, so the unfinished tail is kept until
 * the next chunk (or `end`). */
export class NdjsonParser<T> {
  private tail = "";

  /** The values of every line this chunk completes. */
  push(chunk: string): T[] {
    const lines = (this.tail + chunk).split("\n");
    this.tail = lines.pop() ?? "";
    return lines.flatMap((line) => parseLine<T>(line));
  }

  /** The stream is over: a last line without its "\n" still counts. */
  end(): T[] {
    const rest = this.tail;
    this.tail = "";
    return parseLine<T>(rest);
  }
}

function parseLine<T>(line: string): T[] {
  const text = line.trim();
  return text ? [JSON.parse(text) as T] : [];
}

/** The values of an NDJSON response body, each one as soon as its line has
 * arrived. Throws on a line that is not JSON. Stopping early (a `break`, or
 * the consumer throwing) cancels the response, so the server is not left
 * writing to a connection nobody reads. */
export async function* readNdjson<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) throw new Error("The response has no body to read");
  const parser = new NdjsonParser<T>();
  // `stream: true` keeps a character that is split across two chunks intact.
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let finished = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      yield* parser.push(decoder.decode(value, { stream: true }));
    }
    yield* parser.push(decoder.decode());
    yield* parser.end();
    finished = true;
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
