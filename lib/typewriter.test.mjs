import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createTypewriter } from "./typewriter.ts";

/** Frames the test advances by hand, 16 ms apart. */
function manualFrames() {
  let now = 0;
  let next = 1;
  const waiting = new Map();
  return {
    request(run) {
      waiting.set(next, run);
      return next++;
    },
    cancel(handle) {
      waiting.delete(handle);
    },
    /** Run one frame; false when none was waiting. */
    tick(ms = 16) {
      const entry = [...waiting.entries()][0];
      if (!entry) return false;
      waiting.delete(entry[0]);
      now += ms;
      entry[1](now);
      return true;
    },
    run(maxFrames = 2000) {
      let frames = 0;
      while (frames < maxFrames && this.tick()) frames++;
      return frames;
    },
    get pending() {
      return waiting.size;
    },
  };
}

function typed() {
  const frames = manualFrames();
  const pieces = [];
  const writer = createTypewriter((text) => pieces.push(text), frames);
  return { frames, pieces, writer, text: () => pieces.join("") };
}

test("a piece that arrives at once is typed out over many frames, in order", () => {
  const { frames, pieces, writer, text } = typed();
  const piece = "Annual leave is twelve days per year, as the policy states. ".repeat(5);
  writer.push(piece);
  assert.deepEqual(pieces, [], "nothing before the first frame");
  const count = frames.run();
  assert.equal(text(), piece);
  assert.ok(pieces.length > 10, `typed in ${pieces.length} steps`);
  assert.ok(count > 10 && count < 300, `${count} frames`);
  assert.ok(pieces.every((p) => p.length < piece.length / 4), "never most of it in one go");
});

test("a short piece is typed slowly, a character or two per frame", () => {
  const { frames, pieces, writer } = typed();
  writer.push("Hello there");
  frames.tick();
  assert.ok(pieces.join("").length <= 1);
  frames.run();
  assert.equal(pieces.join(""), "Hello there");
});

test("the typing speeds up with the backlog, but never faster than 400 characters a second", () => {
  const revealedInASecond = (size) => {
    const { frames, writer, text } = typed();
    writer.push("x".repeat(size));
    for (let i = 0; i < 62; i++) frames.tick(); // about one second of frames
    return text().length;
  };
  const small = revealedInASecond(30);
  const large = revealedInASecond(2000);
  assert.ok(large > small, `${large} vs ${small} characters in a second`);
  assert.ok(large <= 410, `${large} characters in a second`);
  assert.ok(large >= 300, `${large} characters in a second`);
});

test("a whole answer that arrives at once is still seen being typed for over a second", () => {
  const { frames, pieces, writer, text } = typed();
  const answer = "The leave policy says twelve days per year. ".repeat(14); // about 600 characters
  writer.push(answer);
  const count = frames.run();
  assert.equal(text(), answer);
  assert.ok(count * 16 > 1000, `typed over ${count * 16} ms`);
  assert.ok(pieces.length > 100, `${pieces.length} steps`);
});

test("finish with nothing left resolves at once", async () => {
  const { writer } = typed();
  await writer.finish();
});

test("finish reveals what is left faster than normal and then resolves", async () => {
  const { frames, writer, text } = typed();
  const piece = "z".repeat(400);
  writer.push(piece);
  frames.tick();
  const done = writer.finish();
  const count = frames.run();
  await done;
  assert.equal(text(), piece);
  assert.ok(count < 90, `${count} frames to drain 400 characters`);
});

test("finish gives up waiting for frames that never come and shows everything", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { writer, text } = typed();
    writer.push("hidden tab");
    const done = writer.finish();
    mock.timers.tick(4000);
    await done;
    assert.equal(text(), "hidden tab");
  } finally {
    mock.timers.reset();
  }
});

test("cancel drops the rest and lets a waiting finish go", async () => {
  const { frames, writer, text } = typed();
  writer.push("never fully shown ".repeat(10));
  frames.tick();
  const shownBefore = text().length;
  const done = writer.finish();
  writer.cancel();
  await done;
  frames.run();
  assert.equal(text().length, shownBefore);
  writer.push("again");
  frames.run();
  assert.ok(text().endsWith("again"));
});

test("a character outside the basic plane is never cut in half", () => {
  const { frames, pieces, writer } = typed();
  writer.push("ab😀cd".repeat(20));
  frames.run();
  for (const piece of pieces) {
    assert.ok(!/^[\udc00-\udfff]/.test(piece) && !/[\ud800-\udbff]$/.test(piece), `piece ${JSON.stringify(piece)}`);
  }
});

test("a frame that comes very late reveals only a short step", () => {
  const { frames, pieces, writer } = typed();
  writer.push("q".repeat(1000));
  frames.tick(10_000); // a stalled tab
  assert.ok(pieces.join("").length < 300);
});
