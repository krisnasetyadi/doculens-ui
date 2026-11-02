import assert from "node:assert/strict";
import { test } from "node:test";
import { canSyncPublicLink, hasIndexingLink, publicLinkIndexBadge } from "./public-link-index.ts";

test("a link being indexed shows its progress once there is some", () => {
  assert.deepEqual(publicLinkIndexBadge({ index_status: "indexing", index_progress: 42, index_ready: false }), {
    label: "Indexing 42%",
    tone: "info",
  });
  assert.equal(publicLinkIndexBadge({ index_status: "indexing", index_progress: null, index_ready: false }).label, "Indexing");
});

test("a failed first index and a failed rebuild read differently", () => {
  assert.equal(publicLinkIndexBadge({ index_status: "failed", index_progress: null, index_ready: false }).label, "Failed");
  // The previous index is still searched, so this is only a failed sync.
  assert.equal(publicLinkIndexBadge({ index_status: "failed", index_progress: null, index_ready: true }).label, "Sync failed");
});

test("ready, and a link added before indexing that has not started yet", () => {
  assert.equal(publicLinkIndexBadge({ index_status: "ready", index_progress: 100, index_ready: true }).label, "Ready");
  assert.equal(publicLinkIndexBadge({ index_status: "pending", index_progress: null, index_ready: false }).label, "Waiting to index");
  assert.equal(publicLinkIndexBadge({ index_status: "queued", index_progress: null, index_ready: false }).label, "Queued");
});

test("sync waits for a queued or running build unless it stopped reporting", () => {
  assert.equal(canSyncPublicLink({ index_status: "ready", index_stale: false }), true);
  assert.equal(canSyncPublicLink({ index_status: "failed", index_stale: false }), true);
  assert.equal(canSyncPublicLink({ index_status: "queued", index_stale: false }), false);
  assert.equal(canSyncPublicLink({ index_status: "indexing", index_stale: false }), false);
  assert.equal(canSyncPublicLink({ index_status: "indexing", index_stale: true }), true);
});

test("the list keeps refreshing only while a link is waiting for or being indexed", () => {
  assert.equal(hasIndexingLink(undefined), false);
  assert.equal(hasIndexingLink([{ index_status: "ready", index_stale: false }, { index_status: "failed", index_stale: false }]), false);
  assert.equal(hasIndexingLink([{ index_status: "ready", index_stale: false }, { index_status: "indexing", index_stale: false }]), true);
  assert.equal(hasIndexingLink([{ index_status: "pending", index_stale: false }]), true);
  assert.equal(hasIndexingLink([{ index_status: "queued", index_stale: false }]), true);
  // Cut off: it won't move until someone syncs it.
  assert.equal(hasIndexingLink([{ index_status: "indexing", index_stale: true }]), false);
});
