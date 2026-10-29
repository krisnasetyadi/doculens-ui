import assert from "node:assert/strict";
import { test } from "node:test";
import { completeStreamingMarkdown as complete } from "./streaming-markdown.ts";

test("text that is already safe is left alone", () => {
  for (const text of ["", "Hello", "Hello **world**\n", "- one\n- two", "1. one\n2. two\n", "A paragraph.\n\nAnother"]) {
    assert.equal(complete(text), text);
  }
});

test("an unclosed code fence is closed", () => {
  assert.equal(complete("Run:\n```bash\nnpm test"), "Run:\n```bash\nnpm test\n```");
  assert.equal(complete("```\nline\n"), "```\nline\n```");
  assert.equal(complete("~~~\ncode"), "~~~\ncode\n~~~");
});

test("a closed code fence is left alone", () => {
  const text = "```js\nconst a = 1;\n```\nDone";
  assert.equal(complete(text), text);
});

test("a fence is closed with a marker as long as the one that opened it", () => {
  assert.equal(complete("````md\n```\ninner\n```\nstill open"), "````md\n```\ninner\n```\nstill open\n````");
});

test("pipes inside an open code fence are code, not a table", () => {
  assert.equal(complete("```\n| a | b |"), "```\n| a | b |\n```");
});

test("a table header with no delimiter row yet is held back", () => {
  assert.equal(complete("Intro\n\n| Name | Days |"), "Intro\n");
  assert.equal(complete("| Name | Days |\n"), "| Name | Days |\n");
});

test("a delimiter row that is still being typed keeps the table held back", () => {
  assert.equal(complete("Intro\n\n| Name | Days |\n|---|"), "Intro\n");
  assert.equal(complete("Intro\n\n| Name | Days |\n|"), "Intro\n");
});

test("a header with its delimiter row is shown as a table", () => {
  const text = "Intro\n\n| Name | Days |\n|---|---|";
  assert.equal(complete(text), text);
});

test("a table row that is not finished yet is held back", () => {
  assert.equal(
    complete("| Name | Days |\n|---|---|\n| Annual | 12 |\n| Sic"),
    "| Name | Days |\n|---|---|\n| Annual | 12 |",
  );
});

test("a finished table row is kept", () => {
  const text = "| Name | Days |\n|---|---|\n| Annual | 12 |";
  assert.equal(complete(text), text);
});

test("text after a table is not mistaken for part of it", () => {
  const text = "| Name | Days |\n|---|---|\n| Annual | 12 |\n\nThat is all so f";
  assert.equal(complete(text), text);
});

test("a list marker with nothing after it yet is held back", () => {
  assert.equal(complete("Steps:\n\n- one\n-"), "Steps:\n\n- one");
  assert.equal(complete("1. one\n2."), "1. one");
  assert.equal(complete("Steps\n-"), "Steps");
});

test("a heading mark with nothing after it yet is held back", () => {
  assert.equal(complete("Intro\n\n##"), "Intro\n");
});

test("a horizontal rule is not a bare marker", () => {
  assert.equal(complete("Above\n\n---"), "Above\n\n---");
});
