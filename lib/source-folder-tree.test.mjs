import assert from "node:assert/strict";
import { test } from "node:test";
import { canMoveFolder, childFolders, folderBreadcrumbs, folderPath, matchingFolderIds } from "./source-folder-tree.ts";

const folders = [
  { folder_id: "contracts", parent_folder_id: null, name: "Contracts" },
  { folder_id: "year", parent_folder_id: "contracts", name: "2026" },
  { folder_id: "client", parent_folder_id: "year", name: "Client A" },
  { folder_id: "finance", parent_folder_id: null, name: "Finance" },
  { folder_id: "finance-year", parent_folder_id: "finance", name: "2026" },
];

test("shows only direct child folders and builds the full breadcrumb", () => {
  assert.deepEqual(childFolders(folders, null).map((folder) => folder.folder_id), ["contracts", "finance"]);
  assert.deepEqual(childFolders(folders, "contracts").map((folder) => folder.folder_id), ["year"]);
  assert.deepEqual(folderBreadcrumbs(folders, "client").map((folder) => folder.folder_id), ["contracts", "year", "client"]);
  assert.equal(folderPath(folders, "client"), "Contracts / 2026 / Client A");
});

test("folder moves reject cycles and a subtree deeper than three levels", () => {
  assert.equal(canMoveFolder(folders, "contracts", "client"), false);
  assert.equal(canMoveFolder(folders, "year", "finance-year"), false);
  assert.equal(canMoveFolder(folders, "client", "finance-year"), true);
  assert.equal(canMoveFolder(folders, "year", null), true);
});

test("search keeps matching folders and their ancestors visible", () => {
  assert.deepEqual([...matchingFolderIds(folders, "client")], ["contracts", "year", "client"]);
  assert.deepEqual([...matchingFolderIds(folders, "2026")], ["contracts", "year", "finance", "finance-year"]);
  assert.equal(matchingFolderIds(folders, "missing").size, 0);
});
