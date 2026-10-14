import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, isLimitError, isMissingError } from "./api-error.ts";

test("404 and 403 both count as a missing record", () => {
  assert.equal(isMissingError(new ApiError("Session not found", 404)), true);
  assert.equal(isMissingError(new ApiError("Not allowed to access this session", 403)), true);
});

test("other API failures are not a missing record", () => {
  for (const status of [400, 401, 413, 500, 503]) {
    assert.equal(isMissingError(new ApiError("boom", status)), false, `status ${status}`);
  }
});

test("a plain Error or a non-error is never a missing record", () => {
  assert.equal(isMissingError(new Error("Failed to fetch")), false);
  assert.equal(isMissingError({ status: 404 }), false);
  assert.equal(isMissingError(undefined), false);
});

test("a limit refusal is not a missing record, and the reverse", () => {
  assert.equal(isMissingError(new ApiError("full", 413)), false);
  assert.equal(isLimitError(new ApiError("gone", 404)), false);
});
