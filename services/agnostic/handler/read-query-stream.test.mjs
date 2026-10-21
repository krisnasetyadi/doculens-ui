import assert from "node:assert/strict";
import { test } from "node:test";
import { followQueryStream } from "./read-query-stream.ts";

const RESULT = { answer: "Leave is twelve days.", model_used: "gemini/x", pdf_sources: [] };

/** The events of a stream; `state.closed` says whether the consumer stopped before the end. */
function eventsOf(events) {
  const state = { closed: false };
  async function* generate() {
    try {
      yield* events;
      state.finished = true;
    } finally {
      state.closed = !state.finished;
    }
  }
  return { events: generate(), state };
}

function recorder() {
  const calls = [];
  return {
    calls,
    handlers: {
      onSources: (sources) => calls.push(["sources", sources.retrieved_count]),
      onDelta: (text) => calls.push(["delta", text]),
    },
  };
}

test("passes the sources and every piece of text on, in order, and resolves with the finished answer", async () => {
  const { events } = eventsOf([
    { type: "sources", pdf_sources: ["a.pdf"], source_type: "Indexed Collections", retrieved_count: 1 },
    { type: "delta", text: "Leave is " },
    { type: "delta", text: "twelve days." },
    { type: "done", result: RESULT },
  ]);
  const { calls, handlers } = recorder();
  assert.deepEqual(await followQueryStream(events, handlers), RESULT);
  assert.deepEqual(calls, [["sources", 1], ["delta", "Leave is "], ["delta", "twelve days."]]);
});

test("a reply that needed no model is a lone done event", async () => {
  const { events } = eventsOf([{ type: "done", result: RESULT }]);
  const { calls, handlers } = recorder();
  assert.deepEqual(await followQueryStream(events, handlers), RESULT);
  assert.deepEqual(calls, []);
});

test("an error event rejects with the backend's message, after the text that came before it", async () => {
  const { events, state } = eventsOf([
    { type: "delta", text: "Leave is " },
    { type: "error", detail: "Failed to answer the question" },
    { type: "delta", text: "never read" },
  ]);
  const { calls, handlers } = recorder();
  await assert.rejects(followQueryStream(events, handlers), { message: "Failed to answer the question" });
  assert.deepEqual(calls, [["delta", "Leave is "]]);
  assert.equal(state.closed, true);
});

test("events that end without a finished answer reject", async () => {
  const { events } = eventsOf([{ type: "delta", text: "Leave is " }]);
  await assert.rejects(followQueryStream(events, recorder().handlers), /cut off/);
});

test("a handler that throws stops the stream", async () => {
  const { events, state } = eventsOf([{ type: "delta", text: "x" }, { type: "done", result: RESULT }]);
  const handlers = { onSources() {}, onDelta() { throw new Error("render failed"); } };
  await assert.rejects(followQueryStream(events, handlers), { message: "render failed" });
  assert.equal(state.closed, true);
});
