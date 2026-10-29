/** When to run the next frame. The browser's animation frame by default; the
 * callback receives the frame's timestamp in milliseconds. */
export interface FrameScheduler {
  request: (run: (now: number) => void) => number;
  cancel: (handle: number) => void;
}

const browserFrames: FrameScheduler = {
  request: (run) => requestAnimationFrame(run),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/** The slowest the text is typed, so a short piece still reads as typing. */
const MIN_CHARS_PER_SECOND = 60;
/** The fastest it is typed (about 65 words a second): however much arrives at
 * once, it is never thrown onto the screen, it is always seen being typed. */
const MAX_CHARS_PER_SECOND = 400;
/** Between the two the typing speeds up with the backlog: it works through it
 * at a rate of (backlog / this) per second, so it does not fall far behind. */
const CATCH_UP_SECONDS = 0.5;
/** Once the answer is complete, what is left is worked off faster, so the
 * finished answer does not keep the reader waiting for text already written. */
const DRAIN_MIN_CHARS_PER_SECOND = 400;
const DRAIN_MAX_CHARS_PER_SECOND = 1200;
/** The most `finish` waits, whatever the frames do (a hidden tab runs none). */
const MAX_DRAIN_MS = 4000;
/** A frame that comes late (a stalled tab) must not reveal a jump of text. */
const MAX_FRAME_MS = 100;

export interface Typewriter {
  /** Text that has arrived; it is revealed over the next frames. */
  push: (text: string) => void;
  /** The answer is complete: reveal what is left quickly, and resolve once all of it is out. */
  finish: () => Promise<void>;
  /** Drop what has not been revealed yet (and let a waiting `finish` go). */
  cancel: () => void;
}

const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/** Reveals streamed text as if it were being typed. The model sends it in
 * pieces of a sentence or more, at whatever moments; this passes it to
 * `onReveal` a few characters per frame instead, between 60 and 400 characters
 * a second (faster the more is waiting), so the text is always seen being
 * typed. Also at most one render per frame. */
export function createTypewriter(
  onReveal: (text: string) => void,
  frames: FrameScheduler = browserFrames,
): Typewriter {
  let received = "";
  let shown = 0;
  let owed = 0; // a fraction of a character carried to the next frame
  let lastFrame: number | null = null;
  let handle: number | null = null;
  let slowest = MIN_CHARS_PER_SECOND;
  let fastest = MAX_CHARS_PER_SECOND;
  let waiting: Array<() => void> = [];
  let giveUp: ReturnType<typeof setTimeout> | null = null;

  const releaseWaiting = () => {
    if (giveUp !== null) clearTimeout(giveUp);
    giveUp = null;
    const resolvers = waiting;
    waiting = [];
    resolvers.forEach((resolve) => resolve());
  };

  const revealUpTo = (end: number) => {
    // Never cut between the two halves of a character outside the basic plane.
    const to = end < received.length && isLowSurrogate(received.charCodeAt(end)) ? end + 1 : end;
    if (to <= shown) return;
    const text = received.slice(shown, to);
    shown = to;
    onReveal(text);
  };

  const frame = (now: number) => {
    handle = null;
    const elapsed = lastFrame === null ? 16 : Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    const backlog = received.length - shown;
    const speed = Math.min(fastest, Math.max(slowest, backlog / CATCH_UP_SECONDS));
    owed += (speed * elapsed) / 1000;
    const whole = Math.floor(owed);
    owed -= whole;
    revealUpTo(shown + Math.min(whole, backlog));

    if (shown < received.length) {
      handle = frames.request(frame);
    } else {
      lastFrame = null;
      owed = 0;
      releaseWaiting();
    }
  };

  const run = () => {
    if (handle === null && shown < received.length) handle = frames.request(frame);
  };

  return {
    push(text) {
      received += text;
      run();
    },
    finish() {
      if (shown >= received.length) return Promise.resolve();
      slowest = DRAIN_MIN_CHARS_PER_SECOND;
      fastest = DRAIN_MAX_CHARS_PER_SECOND;
      return new Promise<void>((resolve) => {
        waiting.push(resolve);
        giveUp ??= setTimeout(() => {
          revealUpTo(received.length);
          releaseWaiting();
        }, MAX_DRAIN_MS);
        run();
      });
    },
    cancel() {
      if (handle !== null) frames.cancel(handle);
      handle = null;
      received = "";
      shown = 0;
      owed = 0;
      lastFrame = null;
      slowest = MIN_CHARS_PER_SECOND;
      fastest = MAX_CHARS_PER_SECOND;
      releaseWaiting();
    },
  };
}
