import assert from "node:assert/strict";
import { test } from "node:test";
import { isHttpUrl, splitLines } from "./url.ts";

test("accepts http and https links with a host", () => {
  assert.equal(isHttpUrl("https://drive.google.com/file/d/abc/view?usp=sharing"), true);
  assert.equal(isHttpUrl("http://example.com/document.pdf"), true);
});

test("refuses what the server refuses", () => {
  for (const value of ["", "example.com", "ftp://example.com/a.pdf", "mailto:a@example.test", "javascript:alert(1)", "https://"]) {
    assert.equal(isHttpUrl(value), false, value);
  }
});

test("reads one link per line and drops blank lines", () => {
  assert.deepEqual(splitLines("  https://a.test/1.pdf \n\n https://b.test/2.pdf\n"), ["https://a.test/1.pdf", "https://b.test/2.pdf"]);
  assert.deepEqual(splitLines(" \n "), []);
});
