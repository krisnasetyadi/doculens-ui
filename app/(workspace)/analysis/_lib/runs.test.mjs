import assert from "node:assert/strict";
import { test } from "node:test";
import { filterRuns, formatElapsed } from "./runs.ts";

const labels = { ref: "ISO 27001", a: "Kebijakan IT.pdf", b: "SOP Backup.pdf" };
const labelOf = (id) => labels[id] ?? id;
const runs = [
  { run_id: "1", framework_name: "ISO 27001", reference_collection_ids: ["ref"], target_collection_ids: ["a"] },
  { run_id: "2", framework_name: "ISO 9001", reference_collection_ids: ["x"], target_collection_ids: ["b"] },
];
const ids = (list) => list.map((run) => run.run_id);

test("search matches the framework or any document name, ignoring case", () => {
  assert.deepEqual(ids(filterRuns(runs, "  iso 9001 ", labelOf)), ["2"]);
  assert.deepEqual(ids(filterRuns(runs, "backup", labelOf)), ["2"]);
  assert.deepEqual(ids(filterRuns(runs, "27001", labelOf)), ["1"]);
  assert.deepEqual(ids(filterRuns(runs, "", labelOf)), ["1", "2"]);
  assert.deepEqual(ids(filterRuns(runs, "nothing", labelOf)), []);
});

test("elapsed time reads as seconds, then minutes, then hours", () => {
  assert.equal(formatElapsed(0), "0s");
  assert.equal(formatElapsed(45_400), "45s");
  assert.equal(formatElapsed(185_000), "3m 05s");
  assert.equal(formatElapsed(3_720_000), "1h 02m");
  assert.equal(formatElapsed(-5), "0s");
});
