import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canMoveFolder,
  childFolders,
  documentCountByFolder,
  documentsInFolder,
  folderBreadcrumbs,
  folderPath,
  folderWithDescendants,
  matchingFolderIds,
} from "./source-folder-tree.ts";

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

const documents = [
  { collection_id: "nda", folder_id: "client" },
  { collection_id: "msa", folder_id: "year" },
  { collection_id: "budget", folder_id: "finance-year" },
  { collection_id: "loose", folder_id: null },
  { collection_id: "standard", folder_id: "contracts" },
];

test("a folder brings in its sub-folders at every depth", () => {
  assert.deepEqual([...folderWithDescendants(folders, "contracts")].sort(), ["client", "contracts", "year"]);
  assert.deepEqual([...folderWithDescendants(folders, "client")], ["client"]);
});

test("a folder offers its documents and its sub-folders' documents, without the excluded one", () => {
  const ids = (docs) => docs.map((doc) => doc.collection_id);
  assert.deepEqual(ids(documentsInFolder(folders, documents, "contracts")), ["nda", "msa", "standard"]);
  assert.deepEqual(ids(documentsInFolder(folders, documents, "contracts", new Set(["standard"]))), ["nda", "msa"]);
  assert.deepEqual(ids(documentsInFolder(folders, documents, "year")), ["nda", "msa"]);
  assert.deepEqual(ids(documentsInFolder(folders, documents, "client")), ["nda"]);
  // A document outside every folder is never offered.
  assert.equal(ids(documentsInFolder(folders, documents, "finance")).includes("loose"), false);
});

test("counts per folder include sub-folders and leave out the excluded document", () => {
  const counts = documentCountByFolder(folders, documents, new Set(["standard"]));
  assert.equal(counts.get("contracts"), 2);
  assert.equal(counts.get("year"), 2);
  assert.equal(counts.get("client"), 1);
  assert.equal(counts.get("finance"), 1);
  assert.equal(counts.get("finance-year"), 1);
});

test("counts survive a folder cycle in bad data", () => {
  const looped = [
    { folder_id: "a", parent_folder_id: "b", name: "A" },
    { folder_id: "b", parent_folder_id: "a", name: "B" },
  ];
  const counts = documentCountByFolder(looped, [{ collection_id: "x", folder_id: "a" }]);
  assert.ok(counts.get("a") >= 1);
  assert.deepEqual([...folderWithDescendants(looped, "a")].sort(), ["a", "b"]);
});
