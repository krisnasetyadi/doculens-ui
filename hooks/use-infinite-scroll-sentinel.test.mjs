import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

let slots;
let cursor;
let pending;
let observers;

mock.module('react', {
  namedExports: {
    useRef(value) {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      pending.push(() => {
        previous?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
  },
});

const { useInfiniteScrollSentinel } = await import('./use-infinite-scroll-sentinel.ts');

beforeEach(() => {
  slots = [];
  observers = [];
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.disconnected = false;
      observers.push(this);
    }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
    intersect(isIntersecting) { this.callback([{ isIntersecting }]); }
  };
});

function render(hasMore, loadMore, count, node) {
  cursor = 0;
  pending = [];
  const ref = useInfiniteScrollSentinel(hasMore, loadMore, count);
  ref.current = node;
  pending.forEach(effect => effect());
}

test('loads the next page when the sentinel reaches the modal scroll viewport', () => {
  const loadMore = mock.fn();
  const viewport = {};
  const node = { parentElement: viewport };
  render(true, loadMore, 50, node);
  assert.equal(observers[0].options.root, viewport);
  observers[0].intersect(false);
  assert.equal(loadMore.mock.callCount(), 0);
  observers[0].intersect(true);
  assert.equal(loadMore.mock.callCount(), 1);
});

test('loading and error rerenders do not restart observation or automatically retry', () => {
  const node = { parentElement: {} };
  const first = mock.fn();
  const latest = mock.fn();
  render(true, first, 50, node);
  observers[0].intersect(true);
  render(true, latest, 50, node);
  assert.equal(observers.length, 1);
  assert.equal(latest.mock.callCount(), 0);
  observers[0].intersect(false);
  observers[0].intersect(true);
  assert.equal(latest.mock.callCount(), 1);
});

test('rechecks after a successful page and stops observing when all rows are loaded', () => {
  const node = { parentElement: {} };
  const loadMore = mock.fn();
  render(true, loadMore, 50, node);
  render(true, loadMore, 100, node);
  assert.equal(observers[0].disconnected, true);
  assert.equal(observers.length, 2);
  observers[1].intersect(true);
  assert.equal(loadMore.mock.callCount(), 1);
  render(false, loadMore, 120, node);
  assert.equal(observers[1].disconnected, true);
  assert.equal(observers.length, 2);
});
