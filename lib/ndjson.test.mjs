import assert from "node:assert/strict";
import { test } from "node:test";
import { NdjsonParser, readNdjson } from "./ndjson.ts";

test("a complete line is delivered as soon as its newline arrives", () => {
  assert.deepEqual(new NdjsonParser().push('{"a":1}\n{"a":2}\n'), [{ a: 1 }, { a: 2 }]);
});

test("a line split across chunks is delivered once, whole", () => {
  const parser = new NdjsonParser();
  assert.deepEqual(parser.push('{"text":"he'), []);
  assert.deepEqual(parser.push('llo"}\n'), [{ text: "hello" }]);
});

test("blank lines are skipped", () => {
  assert.deepEqual(new NdjsonParser().push('\n{"a":1}\n\n  \n'), [{ a: 1 }]);
});

test("a last line without a newline is delivered when the stream ends", () => {
  const parser = new NdjsonParser();
  assert.deepEqual(parser.push('{"a":1}'), []);
  assert.deepEqual(parser.end(), [{ a: 1 }]);
  assert.deepEqual(parser.end(), []);
});

test("a line that is not JSON throws", () => {
  assert.throws(() => new NdjsonParser().push("not json\n"), SyntaxError);
});

/** A response whose body arrives in the given chunks; `state.cancelled` says whether the reader gave up on it.
 * With `keepOpen` the connection stays open after the last chunk, as a server still writing would. */
function responseOf(chunks, { keepOpen = false } = {}) {
  const state = { cancelled: false };
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        if (!keepOpen) controller.close();
      },
      cancel() {
        state.cancelled = true;
      },
    }),
  );
  return { response, state };
}

async function all(iterable) {
  const values = [];
  for await (const value of iterable) values.push(value);
  return values;
}

test("readNdjson reads a body that arrives in pieces", async () => {
  const encoder = new TextEncoder();
  const { response } = responseOf([encoder.encode('{"n":1}\n{"n"'), encoder.encode(":2}\n")]);
  assert.deepEqual(await all(readNdjson(response)), [{ n: 1 }, { n: 2 }]);
});

test("readNdjson keeps a multi-byte character that is cut between two chunks", async () => {
  const bytes = new TextEncoder().encode('{"text":"café"}\n');
  const cut = bytes.indexOf(0xc3) + 1; // in the middle of "é"
  const { response } = responseOf([bytes.slice(0, cut), bytes.slice(cut)]);
  assert.deepEqual(await all(readNdjson(response)), [{ text: "café" }]);
});

test("readNdjson rejects when a line is not JSON, and cancels the response", async () => {
  const { response, state } = responseOf([new TextEncoder().encode("oops\n")], { keepOpen: true });
  await assert.rejects(all(readNdjson(response)), SyntaxError);
  assert.equal(state.cancelled, true);
});

test("readNdjson cancels the response when the consumer stops early", async () => {
  const { response, state } = responseOf([new TextEncoder().encode('{"n":1}\n{"n":2}\n')], { keepOpen: true });
  for await (const value of readNdjson(response)) {
    assert.deepEqual(value, { n: 1 });
    break;
  }
  assert.equal(state.cancelled, true);
});

test("a body that ends normally is not cancelled", async () => {
  const { response, state } = responseOf([new TextEncoder().encode('{"n":1}\n')]);
  await all(readNdjson(response));
  assert.equal(state.cancelled, false);
});
