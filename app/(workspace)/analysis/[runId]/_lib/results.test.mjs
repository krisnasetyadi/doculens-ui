import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canOpen,
  checkedItems,
  firstItemKey,
  groupItems,
  nextStepButton,
  pointerOpen,
  pointerPlace,
  searchedText,
  tabCounts,
  todoCount,
  trendText,
} from "./results.ts";

const item = (key, status, extra = {}) => ({
  label: key, status, requirement_key: key, code: null, reason: null, summary: null,
  next_step: null, findings: [], searched: null, trend: null, ...extra,
});

const pointer = (file_name, extra = {}) => ({
  file_name, collection_id: "c", kind: "file", page: null, section: null, paragraph: null, sheet: null, row: null,
  label: file_name, ...extra,
});

const items = checkedItems([
  item("d1", "done"),
  item("m1", "missing"),
  item("m2", "missing"),
  item("m3", "missing"),
  item("m4", "missing"),
  item("m5", "missing"),
  item("i1", "incomplete"),
  item("n1", "needs_decision"),
  item("x1", "not_checked"),
  item("na", "not_applicable"),
]);

test("not checked items are only counted, never listed", () => {
  assert.equal(items.length, 9);
  assert.deepEqual(tabCounts(items), { todo: 7, done: 2, all: 9 });
  assert.equal(todoCount({ missing: 5, incomplete: 1, needs_decision: 1, done: 1 }), 7);
});

test("a tab groups by status, what needs doing first, at most 3 rows each", () => {
  const groups = groupItems(items, "todo", null, new Set());
  assert.deepEqual(groups.map((g) => [g.status, g.total, g.rows.map((r) => r.key), g.hidden]), [
    ["missing", 5, ["m1", "m2", "m3"], 2],
    ["incomplete", 1, ["i1"], 0],
    ["needs_decision", 1, ["n1"], 0],
  ]);
  assert.deepEqual(groupItems(items, "done", null, new Set()).map((g) => g.status), ["done", "not_applicable"]);
});

test("the selected row stays visible and Show more opens a group", () => {
  const [missing] = groupItems(items, "todo", "m5", new Set());
  assert.deepEqual([missing.rows.map((r) => r.key), missing.hidden], [["m1", "m2", "m3", "m5"], 1]);
  const [open] = groupItems(items, "all", null, new Set(["missing"]));
  assert.deepEqual([open.rows.length, open.hidden], [5, 0]);
});

test("the page opens on the first thing to do", () => {
  assert.equal(firstItemKey(items), "m1");
  assert.equal(firstItemKey(checkedItems([item("d", "done")])), "d");
  assert.equal(firstItemKey([]), null);
  // Runs stored before requirement keys existed are keyed by position.
  assert.equal(checkedItems([{ ...item("a", "done"), requirement_key: null }])[0].key, "#0");
});

test("pointers open at their place", () => {
  assert.deepEqual(pointerOpen(pointer("a.pdf", { page: 4 })), { mode: "pdf", page: 4 });
  assert.deepEqual(pointerOpen(pointer("a.docx", { section: "4. Restore", paragraph: 2 })),
    { mode: "text", anchor: { section: "4. Restore", paragraph: 2 } });
  assert.deepEqual(pointerOpen(pointer("a.xlsx", { sheet: "Access", row: 7 })), { mode: "text", anchor: { sheet: "Access", row: 7 } });
  assert.deepEqual(pointerOpen(pointer("deck.pptx", { page: 3 })), { mode: "text", anchor: { slide: 3 } });
  assert.deepEqual(pointerOpen(pointer("a.csv")), { mode: "download" });
});

const finding = (location) => ({ verdict: "partial", text: "x", quote: null, location, suggested_place: null, searched: null });
const revise = { action: "revise_document", explain: "Add a restore test." };

test("the next step is one button with a one-line explanation", () => {
  const pdf = pointer("a.pdf");
  assert.deepEqual(nextStepButton(item("a", "incomplete", { findings: [finding(pdf)], next_step: revise })),
    { label: "Open in document", explain: "Add a restore test.", kind: "open", pointer: pdf });
  assert.equal(nextStepButton(item("a", "missing", { next_step: { action: "upload_document", explain: null } })).label, "Upload document");
  assert.equal(nextStepButton(item("a", "done")), null);
});

test("a next step never opens a pointer that cannot be opened", () => {
  const orphan = pointer("a.pdf", { collection_id: null });
  assert.equal(nextStepButton(item("a", "incomplete", { next_step: revise })).kind, "upload");
  assert.equal(nextStepButton(item("a", "incomplete", { findings: [finding(orphan)], next_step: revise })).kind, "upload");
  assert.equal(canOpen(orphan), false);
  assert.equal(canOpen(null), false);
});

test("a pointer's place reads without its file name", () => {
  assert.equal(pointerPlace(pointer("a.pdf", { kind: "pdf", page: 3 })), "p. 3");
  assert.equal(pointerPlace(pointer("d.pptx", { kind: "slide", page: 4 })), "Slide 4");
  assert.equal(pointerPlace(pointer("b.docx", { kind: "docx", section: "4. Restore", paragraph: 2 })), "Section 4. Restore, paragraph 2");
  assert.equal(pointerPlace(pointer("b.docx", { kind: "docx", paragraph: 1 })), "Paragraph 1");
  assert.equal(pointerPlace(pointer("c.xlsx", { kind: "xlsx", sheet: "Access", row: 7 })), "Access, row 7");
  assert.equal(pointerPlace(pointer("c.xlsx", { kind: "xlsx" })), null);
});

test("trend and search scope read as sentences", () => {
  assert.equal(trendText("improved", "5 Nov"), "Improved since the check on 5 Nov");
  assert.equal(trendText("worse", null), "Worse since the last check");
  assert.equal(trendText(null, "5 Nov"), null);
  assert.equal(searchedText({ folders: ["02 IT Infra"], document_count: 1 }), "02 IT Infra (1 document)");
  assert.equal(searchedText({ folders: ["a", "b"], document_count: 5 }), "2 folders (5 documents)");
  assert.equal(searchedText({ folders: [], document_count: 3 }), "3 documents");
});
