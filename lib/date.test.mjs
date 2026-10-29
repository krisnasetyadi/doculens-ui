import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDayAge, formatDayHeading, isSameDay } from "./date.ts";

// Local times without an offset, so the expectations hold in any time zone.
const NOW = "2026-10-27T10:00";

test("a message shows its time today and its age in calendar days after that", () => {
  const cases = [
    ["2026-10-27T00:01", "00:01"],
    ["2026-10-26T23:59", "Yesterday"],
    ["2026-10-25T10:00", "2 days ago"],
    ["2026-10-21T10:00", "6 days ago"],
    ["2026-10-20T10:00", "Last week"],
    ["2026-10-14T10:00", "Last week"],
    ["2026-10-13T10:00", "2 weeks ago"],
    ["2026-09-28T10:00", "4 weeks ago"],
    ["2026-09-27T10:00", "Last month"],
    ["2026-08-29T10:00", "Last month"],
    ["2026-08-28T10:00", "2 months ago"],
    ["2025-09-22T10:00", "13 months ago"],
  ];
  for (const [value, label] of cases) assert.equal(formatDayAge(value, NOW), label, value);
});

test("a message stamped later than now reads as today", () => {
  assert.equal(formatDayAge("2026-10-28T09:00", NOW), "09:00");
});

test("the day divider names today and yesterday, and dates the rest", () => {
  assert.equal(formatDayHeading("2026-10-27T08:05", NOW), "Today (08:05)");
  assert.equal(formatDayHeading("2026-10-26T14:32", NOW), "Yesterday (14:32)");
  assert.equal(formatDayHeading("2026-10-25T09:15", NOW), "Sunday, 25 October 09:15");
  assert.equal(formatDayHeading("2025-12-31T23:40", NOW), "Wednesday, 31 December 2025 23:40");
});

test("same day means the same calendar day", () => {
  assert.ok(isSameDay("2026-10-27T00:00", "2026-10-27T23:59"));
  assert.ok(!isSameDay("2026-10-26T23:59", "2026-10-27T00:00"));
});
