import assert from "node:assert/strict";
import { test } from "node:test";
import {
  approvedRequirements,
  documentsInFolders,
  folderKey,
  initiallyOn,
  mappingNote,
  reusableLabel,
  searchedFolderIds,
  suggestedFolderKeys,
} from "./setup.ts";

const folders = [
  { folder_id: "f-iso", name: "ISO", path: ["ISO"], document_count: 2, collection_ids: ["c1", "c2"], suggested: true },
  { folder_id: "f-docs", name: "Docs", path: ["ISO", "Docs"], document_count: 1, collection_ids: ["c2"], suggested: false },
  { folder_id: null, name: "Not in a folder", path: [], document_count: 2, collection_ids: ["c3", "soa"], suggested: true },
];

test("the picker starts on the AI's folders, with no folder as its own key", () => {
  assert.deepEqual(suggestedFolderKeys(folders), ["f-iso", ""]);
  assert.equal(folderKey(folders[2]), "");
  assert.deepEqual(searchedFolderIds(["f-iso", ""]), ["f-iso"]);
});

test("documents in the picked folders, once each, without the rule file", () => {
  assert.deepEqual(documentsInFolders(folders, ["f-iso", "f-docs", ""], "soa"), ["c1", "c2", "c3"]);
  assert.deepEqual(documentsInFolders(folders, [], null), []);
});

const requirements = [
  { key: "A.5.1", code: "A.5.1", label: "Policies", applicable: true },
  { key: "A.5.2", code: "A.5.2", label: "Roles", applicable: false },
  { key: "A.5.3", code: "A.5.3", label: "Segregation", applicable: null },
];

test("what the rule file excludes starts switched off, and only switched-on items are checked", () => {
  const on = initiallyOn(requirements);
  assert.deepEqual([...on], ["A.5.1", "A.5.3"]);
  assert.deepEqual(approvedRequirements(requirements, on).map((r) => r.key), ["A.5.1", "A.5.3"]);
});

test("how the columns were matched, and a reusable rule set's line", () => {
  assert.match(mappingNote({ mapped_by: "ai" }), /AI matched/);
  assert.equal(mappingNote({ mapped_by: null }), null);
  const analysis = { framework_name: "ISO 27001", goal: "", requirement_count: 93 };
  assert.equal(reusableLabel(analysis, "5 Nov 2026"), "ISO 27001 · 93 requirements · last checked 5 Nov 2026");
  assert.equal(reusableLabel({ ...analysis, requirement_count: 1 }, null), "ISO 27001 · 1 requirement");
});
