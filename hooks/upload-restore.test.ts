import assert from "node:assert/strict";
import { test } from "node:test";
import dayjs from "dayjs";
import { resolvedByApi } from "./use-files-tab";
import { UploadProgressStream } from "@/services/upload-progress";
import type { SourceFile } from "@/components/workspace/sources-panel/sources-types";

function pending(overrides: Partial<SourceFile> = {}): SourceFile {
  return {
    id: "uploading-1-report.pdf",
    name: "report",
    uploadedAt: dayjs("2026-09-24T10:00:00Z"),
    status: "uploading",
    kind: "pdf",
    rawFileName: "report.pdf",
    ...overrides,
  };
}

function apiFile(overrides: Partial<SourceFile> = {}): SourceFile {
  return {
    id: "real-collection-id",
    name: "report",
    uploadedAt: dayjs("2026-09-24T10:00:05Z"),
    status: "success",
    kind: "pdf",
    rawFileName: "report.pdf",
    collectionId: "real-collection-id",
    ...overrides,
  };
}

test("resolvedByApi matches by uploadId once the live stream reported it", () => {
  const row = pending({ uploadId: "real-collection-id" });
  assert.equal(resolvedByApi(row, [apiFile()]), true);
});

test("resolvedByApi falls back to filename + recency when uploadId never arrived", () => {
  const row = pending({ uploadId: undefined });
  assert.equal(resolvedByApi(row, [apiFile()]), true);
});

test("resolvedByApi does not match an older unrelated collection with the same filename", () => {
  const row = pending({ uploadId: undefined, uploadedAt: dayjs("2026-09-24T10:00:00Z") });
  const olderSameName = apiFile({ uploadedAt: dayjs("2026-09-20T00:00:00Z") });
  assert.equal(resolvedByApi(row, [olderSameName]), false);
});

test("resolvedByApi returns false when nothing matches", () => {
  const row = pending({ uploadId: undefined, rawFileName: "other.pdf" });
  assert.equal(resolvedByApi(row, [apiFile()]), false);
});

test("UploadProgressStream reports a progress line as soon as its \\n is seen", () => {
  // XHR hands back the FULL responseText so far on every tick, not just the
  // new bytes -- read() is always called with the cumulative string.
  const updates: any[] = [];
  const stream = new UploadProgressStream<{ collection_id: string }>((u) => updates.push(u));
  stream.read('{"type":"progress","stage":"reading","progress":10}\n');
  assert.deepEqual(updates.map((u) => [u.stage, u.progress]), [["reading", 10]]);
  stream.read(
    '{"type":"progress","stage":"reading","progress":10}\n' +
    '{"type":"progress","stage":"preparing","progress":35}\n',
  );
  assert.deepEqual(updates.map((u) => [u.stage, u.progress]), [["reading", 10], ["preparing", 35]]);
});

// Regression (found via manual browser testing): a fast/small upload can
// deliver the whole NDJSON body -- ready event included, every line ending
// in "\n" the same as any other -- in a single onprogress tick before
// onload ever fires. A complete line is never ambiguous just because it's
// followed by more text (or isn't), so nothing here should be withheld.
test("UploadProgressStream reports every checkpoint even when the whole response arrives in one read() call", () => {
  const updates: any[] = [];
  const stream = new UploadProgressStream<{ collection_id: string }>((u) => updates.push(u));
  const wholeResponse =
    '{"type":"progress","stage":"reading","progress":10,"upload_id":"abc"}\n' +
    '{"type":"progress","stage":"preparing","progress":35,"upload_id":"abc"}\n' +
    '{"type":"progress","stage":"saving","progress":88,"upload_id":"abc"}\n' +
    '{"type":"ready","progress":100,"result":{"collection_id":"abc","file_count":1,"status":"success"},"upload_id":"abc"}\n';
  stream.read(wholeResponse);
  assert.deepEqual(updates.map((u) => u.stage), ["reading", "preparing", "saving"]);
  assert.equal(updates[0].uploadId, "abc");
  const result = stream.finish(wholeResponse);
  assert.equal(result.collection_id, "abc");
  assert.equal(updates.length, 3); // finish() doesn't re-report what read() already saw
});

test("UploadProgressStream clamps a bogus percentage and never reports >= 100 before ready", () => {
  const updates: any[] = [];
  const stream = new UploadProgressStream<{ collection_id: string }>((u) => updates.push(u));
  const result = stream.finish(
    '{"type":"progress","stage":"saving","progress":500}\n' +
    '{"type":"ready","progress":100,"result":{"collection_id":"abc","status":"success"}}\n',
  );
  assert.equal(result.collection_id, "abc");
  assert.ok(updates.every((u) => u.progress < 100));
});

test("UploadProgressStream.finish throws the backend's detail on an error event", () => {
  const stream = new UploadProgressStream(() => {});
  assert.throws(
    () => stream.finish('{"type":"error","detail":"No messages found in chat file. Please check the file format."}\n'),
    /No messages found/,
  );
});

test("UploadProgressStream rejects a stage outside the known set", () => {
  const stream = new UploadProgressStream(() => {});
  assert.throws(
    () => stream.finish('{"type":"progress","stage":"uploading","progress":10}\n'),
    /Invalid source progress/,
  );
});

test("UploadProgressStream.finish throws if the response was cut off before a ready/error event", () => {
  const stream = new UploadProgressStream(() => {});
  assert.throws(
    () => stream.finish('{"type":"progress","stage":"reading","progress":10}\n'),
    /Source preparation was interrupted/,
  );
});
