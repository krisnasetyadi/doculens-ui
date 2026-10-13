import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guards the one-empty-state rule (MS-676): a screen picks a size of `EmptyState`, it does not build its own.
const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SOURCE_DIRS = ["app", "components", "features"];
const SHARED = "components/empty-state.tsx";

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const files = SOURCE_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir))).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, "utf8"),
}));

function filesMatching(pattern, { except = [SHARED] } = {}) {
  return files.filter((file) => !except.includes(file.path) && pattern.test(file.text)).map((file) => file.path);
}

test("only the shared empty state touches the shadcn Empty primitives", () => {
  assert.deepEqual(filesMatching(/from\s+["']@\/components\/ui\/empty["']/), []);
});

test("no screen wraps a dashed panel by hand to make its own empty state", () => {
  assert.deepEqual(filesMatching(/tone=["']dashed["']/), []);
});

test("empty and no-results wording is the shared English wording", () => {
  // The generic heading is never shown, and a screen does not write its own Indonesian empty line.
  assert.deepEqual(filesMatching(/No data yet|No data available|Belum ada|Tidak ada/), []);
});

test("a search that matches nothing uses NoResults, not its own sentence", () => {
  assert.deepEqual(filesMatching(/No results for|No matching |No matches|No results found/), []);
});
