import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_HISTORY_RANGE, HISTORY_RANGE_OPTIONS, historyRangeLabel } from "./telegram-history.ts";

test("offers the four ranges of the ticket, shortest first", () => {
  assert.deepEqual(
    HISTORY_RANGE_OPTIONS.map((option) => option.value),
    ["1m", "3m", "1y", "all"],
  );
});

test("a newly picked chat keeps the last 3 months", () => {
  assert.equal(DEFAULT_HISTORY_RANGE, "3m");
  assert.ok(HISTORY_RANGE_OPTIONS.some((option) => option.value === DEFAULT_HISTORY_RANGE));
});

test("each range reads in plain words", () => {
  assert.equal(historyRangeLabel("1m"), "Last month");
  assert.equal(historyRangeLabel("3m"), "Last 3 months");
  assert.equal(historyRangeLabel("1y"), "Last year");
  assert.equal(historyRangeLabel("all"), "All messages");
});

test("a range the client does not know reads as everything, what an old chat stores", () => {
  assert.equal(historyRangeLabel("5y"), "All messages");
});
