import assert from "node:assert/strict";
import { test } from "node:test";
import { rehypeStreamingCursor } from "./rehype-streaming-cursor.ts";

const text = (value) => ({ type: "text", value });
const el = (tagName, ...children) => ({ type: "element", tagName, properties: {}, children });
const root = (...children) => ({ type: "root", children });

function withCursor(tree) {
  rehypeStreamingCursor("cursor")()(tree);
  return tree;
}

const isCursor = (node) => node.type === "element" && node.properties?.className?.[0] === "cursor";

test("the cursor goes right after the last character of the last paragraph", () => {
  const p = el("p", text("Hello"));
  withCursor(root(p));
  assert.equal(p.children.length, 2);
  assert.ok(isCursor(p.children[1]));
});

test("the cursor is hidden from assistive technology", () => {
  const p = el("p", text("Hello"));
  withCursor(root(p));
  assert.equal(p.children[1].properties.ariaHidden, "true");
});

test("blank text between blocks is skipped when looking for the last block", () => {
  const p = el("p", text("Hello"));
  withCursor(root(p, text("\n")));
  assert.ok(isCursor(p.children[1]));
});

test("a list ending in a nested list puts the cursor in the deepest item", () => {
  const inner = el("li", text("deep"));
  const outer = el("li", text("top"), el("ul", inner));
  withCursor(root(el("ul", outer)));
  assert.ok(isCursor(inner.children[1]));
  assert.equal(outer.children.length, 2);
});

test("an answer ending in inline markup keeps the cursor after it", () => {
  const p = el("p", text("a "), el("strong", text("bold")));
  withCursor(root(p));
  assert.ok(isCursor(p.children[2]));
});

test("an answer ending in a code block, table or rule gets the cursor on its own line", () => {
  for (const tag of ["pre", "table", "hr"]) {
    const block = el(tag);
    const tree = withCursor(root(el("p", text("x")), block));
    const last = tree.children.at(-1);
    assert.equal(last.tagName, "p", tag);
    assert.ok(isCursor(last.children[0]), tag);
    assert.equal(block.children.length, 0, tag);
  }
});

test("an empty answer still gets a cursor", () => {
  const tree = withCursor(root());
  assert.ok(tree.children.some((node) => isCursor(node) || node.children?.some(isCursor)));
});
