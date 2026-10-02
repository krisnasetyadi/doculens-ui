import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_UPLOAD_LIMITS,
  GB,
  MB,
  QUOTA_EXCEEDED_MESSAGE,
  batchLimitError,
  formatBytes,
  screenFiles,
  summarizeUpload,
  STORAGE_FULL_NOTICE,
  uploadLimitsFrom,
  usageSeverity,
} from "./upload-limits.ts";

const limits = { maxFileBytes: 50 * MB, maxBatchFiles: 10 };
const file = (name, size) => ({ name, size });

test("formats sizes the way the ticket copy reads", () => {
  assert.equal(formatBytes(50 * MB), "50 MB");
  assert.equal(formatBytes(819 * MB), "819 MB");
  assert.equal(formatBytes(5 * GB), "5 GB");
  assert.equal(formatBytes(4.2 * GB), "4.2 GB");
  assert.equal(formatBytes(0), "0 MB");
  // Rounds down: nearly full must not read as full.
  assert.equal(formatBytes(4.97 * GB), "4.9 GB");
  assert.equal(formatBytes(5 * GB - 1), "4.9 GB");
});

test("TS-01: a file over the limit is rejected with the ticket message", () => {
  const { accepted, rejected } = screenFiles([file("big.pdf", 65 * MB)], limits, null);
  assert.equal(accepted.length, 0);
  assert.equal(rejected[0].error, "File exceeds the 50 MB maximum size limit.");
  assert.equal(rejected[0].reason, "size");
});

test("a file exactly at the limit is accepted", () => {
  assert.equal(screenFiles([file("edge.pdf", 50 * MB)], limits, null).accepted.length, 1);
});

test("TS-02: more files than the batch limit is an error, exactly the limit is not", () => {
  assert.equal(batchLimitError(15, limits), "You can only upload up to 10 files at a time.");
  assert.equal(batchLimitError(10, limits), null);
  assert.equal(batchLimitError(1, limits), null);
});

test("TS-03: a valid file that does not fit the remaining space is rejected", () => {
  // The ticket's 100 MB example is over the 50 MB file limit and would be
  // refused for size first, so use a file the size limit accepts.
  const remaining = 5 * GB - 4.97 * GB;
  const { accepted, rejected } = screenFiles([file("a.pdf", 40 * MB)], limits, remaining);
  assert.equal(accepted.length, 0);
  assert.equal(rejected[0].error, QUOTA_EXCEEDED_MESSAGE);
  assert.equal(rejected[0].reason, "quota");
});

test("AC5: space is used in selection order, so the split is deterministic", () => {
  const files = [file("a", 30 * MB), file("b", 30 * MB), file("c", 10 * MB), file("d", 30 * MB)];
  const { accepted, rejected } = screenFiles(files, limits, 70 * MB);
  assert.deepEqual(accepted.map((f) => f.name), ["a", "b", "c"]);
  assert.deepEqual(rejected.map((r) => r.file.name), ["d"]);
});

test("a file that does not fit is skipped and a smaller one after it may still fit", () => {
  const files = [file("big", 40 * MB), file("small", 5 * MB)];
  const { accepted, rejected } = screenFiles(files, limits, 10 * MB);
  assert.deepEqual(accepted.map((f) => f.name), ["small"]);
  assert.deepEqual(rejected.map((r) => r.file.name), ["big"]);
});

test("a file rejected for size does not use up the remaining space", () => {
  const files = [file("huge", 60 * MB), file("ok", 20 * MB)];
  const { accepted } = screenFiles(files, limits, 20 * MB);
  assert.deepEqual(accepted.map((f) => f.name), ["ok"]);
});

test("unknown usage leaves the quota to the server", () => {
  const { accepted } = screenFiles([file("a", 40 * MB), file("b", 40 * MB)], limits, null);
  assert.equal(accepted.length, 2);
});

test("limits come from the usage response, with defaults when it is missing", () => {
  assert.deepEqual(uploadLimitsFrom({ max_file_bytes: 1 * MB, max_batch_files: 3 }), {
    maxFileBytes: 1 * MB,
    maxBatchFiles: 3,
  });
  assert.deepEqual(uploadLimitsFrom(null), DEFAULT_UPLOAD_LIMITS);
});

test("severity follows the token quota scale", () => {
  assert.equal(usageSeverity(42, false), "ok");
  assert.equal(usageSeverity(79.9, false), "ok");
  assert.equal(usageSeverity(80, false), "warn");
  assert.equal(usageSeverity(100, true), "full");
  assert.equal(usageSeverity(50, true), "full");
});

test("AC5: a partly uploaded batch names how many went in and keeps every file's result", () => {
  const outcomes = [
    { name: "a.pdf" },
    { name: "b.pdf" },
    { name: "c.pdf", error: "File exceeds the 50 MB maximum size limit.", limit: "size"  },
    { name: "d.pdf", error: QUOTA_EXCEEDED_MESSAGE, limit: "quota"  },
  ];
  const notice = summarizeUpload(outcomes);
  assert.equal(notice.tone, "warning");
  assert.equal(notice.title, "2 of 4 files uploaded");
  assert.equal(notice.message, "2 files were not uploaded. The reason is next to each file.");
  assert.equal(notice.results.length, 4);
  assert.equal(notice.quota, true);
});

test("a single oversized file gets the size message as is", () => {
  const notice = summarizeUpload([
    { name: "big.pdf", error: "File exceeds the 50 MB maximum size limit.", limit: "size" },
  ]);
  assert.equal(notice.tone, "error");
  assert.equal(notice.title, "Upload blocked");
  assert.equal(notice.message, "File exceeds the 50 MB maximum size limit.");
  assert.equal(notice.quota, false);
  assert.deepEqual(notice.results, []);
});

test("a single file over the storage quota offers to free up space or upgrade", () => {
  const notice = summarizeUpload([{ name: "a.pdf", error: QUOTA_EXCEEDED_MESSAGE, limit: "quota" }]);
  assert.equal(notice.title, "Storage Limit Reached");
  assert.equal(notice.message, "Please delete older files to free up space, or upgrade your plan.");
  assert.equal(notice.quota, true);
});

test("when every file of a batch is refused the notice says nothing was uploaded", () => {
  const notice = summarizeUpload([
    { name: "a.pdf", error: QUOTA_EXCEEDED_MESSAGE, limit: "quota" },
    { name: "b.pdf", error: QUOTA_EXCEEDED_MESSAGE, limit: "quota" },
  ]);
  assert.equal(notice.title, "Nothing was uploaded");
  assert.equal(notice.tone, "error");
  assert.equal(notice.results.length, 2);
});

test("the full-storage notice always offers the quota actions", () => {
  assert.equal(STORAGE_FULL_NOTICE.quota, true);
  assert.equal(STORAGE_FULL_NOTICE.title, "Storage Limit Reached");
});
