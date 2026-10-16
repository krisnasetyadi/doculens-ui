import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { errorToast, reducer } from "./use-toast.ts";

// Guards the one-place-for-messages rules (MS-677).
const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const toast = (id) => ({ id, title: `toast ${id}`, open: true });

test("up to three toasts stack and the oldest goes first", () => {
  let state = { toasts: [] };
  for (const id of ["1", "2", "3", "4"]) state = reducer(state, { type: "ADD_TOAST", toast: toast(id) });
  assert.deepEqual(state.toasts.map((t) => t.id), ["4", "3", "2"]);
});

test("a toast that already closed does not push out one still on screen", () => {
  let state = { toasts: [] };
  for (const id of ["error", "ok1", "ok2"]) state = reducer(state, { type: "ADD_TOAST", toast: toast(id) });
  // The two success toasts close first; the error toast stays open longer.
  state = { toasts: state.toasts.map((t) => (t.id === "error" ? t : { ...t, open: false })) };
  state = reducer(state, { type: "ADD_TOAST", toast: toast("next") });
  assert.deepEqual(state.toasts.map((t) => t.id), ["next", "error"]);
});

test("an error toast has a title, the server's reason, and the error style", () => {
  assert.deepEqual(errorToast("Couldn't save", new Error("Name is taken")), {
    title: "Couldn't save",
    description: "Name is taken",
    variant: "destructive",
  });
  assert.equal(errorToast("Couldn't save", "not an Error").description, "Please try again.");
});

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(path) && !/\.test\./.test(path) ? [path] : [];
  });
}

const files = ["app", "components", "features", "hooks"].flatMap((dir) => sourceFiles(join(ROOT, dir))).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, "utf8"),
}));

test("a toast title says what happened, never just Error", () => {
  assert.deepEqual(files.filter((f) => /title:\s*["']Error["']/.test(f.text)).map((f) => f.path), []);
});

test("toast titles are in the UI language, not Indonesian", () => {
  const indonesian = /title:\s*[`"'][^`"']*\b(Gagal|Tidak|Coba|terkirim|ditambahkan|selesai|Tekan)\b/;
  assert.deepEqual(files.filter((f) => indonesian.test(f.text)).map((f) => f.path), []);
});

test("one inline form message component, not a second one beside it", () => {
  assert.deepEqual(files.filter((f) => /@\/components\/form-error/.test(f.text)).map((f) => f.path), []);
});
