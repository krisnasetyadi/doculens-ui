import assert from "node:assert/strict";
import { test } from "node:test";
import { correctionDefaults, correctionRequest, correctionSchema, documentValue } from "./correction-form.ts";

const item = (status) => ({ label: "Access", status, requirement_key: "A.8.2", code: "A.8.2", findings: [] });
const values = (extra = {}) => ({ ...correctionDefaults(item("missing")), kind: "wrong_status", status: "done", reason: "In HR.", ...extra });
const messages = (input) => {
  const result = correctionSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

test("the dialog opens on deciding for an undecided item, else on a missed document", () => {
  assert.equal(correctionDefaults(item("needs_decision")).kind, "wrong_status");
  assert.equal(correctionDefaults(item("missing")).kind, "missed_document");
});

test("changing a correction starts from it", () => {
  const corrected = {
    ...item("done"),
    ai_status: "missing",
    correction: {
      kind: "missed_document", status: "done", reason: "In HR.",
      document: { collection_id: "c1", file_name: "hr.pdf", section: "Section 2" },
    },
  };
  assert.deepEqual(correctionDefaults(corrected), {
    kind: "missed_document", status: "done", document: documentValue("c1", "hr.pdf"), section: "Section 2",
    reason: "In HR.", remember: false,
  });
});

test("what a correction needs", () => {
  assert.deepEqual(messages(values()), []);
  assert.deepEqual(messages(values({ reason: "  " })), ["reason: Enter a short reason"]);
  assert.deepEqual(messages(values({ status: "" })), ["status: Choose the right status"]);
  assert.deepEqual(messages(values({ kind: "not_applicable", status: "" })), []); // not applicable needs no status
  assert.deepEqual(messages(values({ kind: "missed_document" })), ["document: Choose the document the AI missed"]);
});

test("the request names the document and section, and not applicable sets its own status", () => {
  const missed = correctionRequest(values({ kind: "missed_document", document: documentValue("c1", "PO::P03.docx"), section: " Section 2 " }));
  assert.deepEqual(missed.document, { collection_id: "c1", file_name: "PO::P03.docx", section: "Section 2" });
  assert.equal(correctionRequest(values({ kind: "wrong_status", document: documentValue("c1", "a.pdf") })).document, null);
  assert.equal(correctionRequest(values({ kind: "not_applicable", status: "done" })).status, "not_applicable");
});
