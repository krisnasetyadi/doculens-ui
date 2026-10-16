import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STOPPED_MODEL,
  composerAfterStop,
  isStoppedNote,
  memoryEligible,
  stoppedNote,
  type Message,
} from "./chat-types";

const question = (id: string, content = `question ${id}`): Message => ({ id, role: "user", content });
const answer = (id: string): Message => ({ id, role: "assistant", content: `answer ${id}`, modelUsed: "gemini/x" });

test("a stopped note is an assistant message carrying the stopped marker", () => {
  const note = stoppedNote("n1");
  assert.equal(note.role, "assistant");
  assert.equal(note.content, "");
  assert.equal(note.modelUsed, STOPPED_MODEL);
  assert.ok(isStoppedNote(note));
  assert.ok(!isStoppedNote(answer("a1")));
  assert.ok(!isStoppedNote({ role: "user", modelUsed: STOPPED_MODEL }));
});

test("a stopped question and its note stay out of the memory", () => {
  const thread = [question("q1"), answer("a1"), question("q2"), stoppedNote("n2"), question("q3"), answer("a3")];
  assert.deepEqual(memoryEligible(thread).map((m) => m.id), ["q1", "a1", "q3", "a3"]);
});

test("static replies stay out of the memory, their questions stay in", () => {
  const staticReply: Message = { id: "s1", role: "assistant", content: "Pick a source first" };
  assert.deepEqual(memoryEligible([question("q1"), staticReply]).map((m) => m.id), ["q1"]);
});

test("a question still waiting for its answer stays in the memory", () => {
  assert.deepEqual(memoryEligible([question("q1")]).map((m) => m.id), ["q1"]);
});

/** Small seeded PRNG (mulberry32), so a failing random case can be replayed. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("random threads: the memory rules hold for 2000 generated threads", () => {
  const next = random(667);
  for (let run = 0; run < 2000; run++) {
    // A thread is a run of turns: a question, then a model answer, a static
    // reply, a stopped note, or nothing yet (still waiting) on the last one.
    const thread: Message[] = [];
    const turns = Math.floor(next() * 12);
    for (let t = 0; t < turns; t++) {
      thread.push(question(`q${t}`));
      const kind = next();
      if (kind < 0.4) thread.push(answer(`a${t}`));
      else if (kind < 0.6) thread.push({ id: `s${t}`, role: "assistant", content: "static" });
      else if (kind < 0.85) thread.push(stoppedNote(`n${t}`));
      else if (t < turns - 1) thread.push(answer(`a${t}`));
    }
    const kept = memoryEligible(thread);
    const seed = `run ${run}: ${thread.map((m) => m.id).join(",")}`;

    // Order is preserved: the result is a subsequence of the thread.
    let at = 0;
    for (const m of kept) {
      at = thread.indexOf(m, at);
      assert.ok(at >= 0, seed);
      at++;
    }
    // No stopped note, no static reply.
    assert.ok(kept.every((m) => !isStoppedNote(m)), seed);
    assert.ok(kept.every((m) => m.role === "user" || m.modelUsed), seed);
    // A question is kept exactly when it was not stopped.
    thread.forEach((m, i) => {
      if (m.role !== "user") return;
      const stopped = thread[i + 1] !== undefined && isStoppedNote(thread[i + 1]);
      assert.equal(kept.includes(m), !stopped, seed);
    });
    // Every model answer is kept.
    thread.filter((m) => m.modelUsed && !isStoppedNote(m)).forEach((m) => assert.ok(kept.includes(m), seed));
  }
});

test("random input: the composer keeps what the user typed after a stop", () => {
  const next = random(42);
  const texts = ["", " ", "\n", "  \t ", "new question", " draft ", "/weekly-report this week"];
  for (let run = 0; run < 500; run++) {
    const current = texts[Math.floor(next() * texts.length)];
    const stopped = texts[Math.floor(next() * texts.length)] || "stopped question";
    const result = composerAfterStop(current, stopped);
    assert.equal(result, current.trim() ? current : stopped, `${JSON.stringify(current)} / ${JSON.stringify(stopped)}`);
  }
});

test("the stopped question goes back into an empty composer only", () => {
  assert.equal(composerAfterStop("", "what is the leave policy?"), "what is the leave policy?");
  assert.equal(composerAfterStop("   ", "what is the leave policy?"), "what is the leave policy?");
  assert.equal(composerAfterStop("something new", "what is the leave policy?"), "something new");
});
