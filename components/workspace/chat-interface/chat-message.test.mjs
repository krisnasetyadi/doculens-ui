import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = ts.createSourceFile("chat-message.tsx", readFileSync(new URL("./chat-message.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const markdown = [];
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "ReactMarkdown") markdown.push(node.openingElement);
  ts.forEachChild(node, visit);
}
visit(source);
const attribute = (element, name) => element.attributes.properties.find((prop) =>
  ts.isJsxAttribute(prop) && prop.name.getText(source) === name);

test("restricted user markdown has no inactive file-link renderer", () => {
  const user = markdown.find((element) => attribute(element, "allowedElements"));
  assert.ok(user);
  assert.equal(Boolean(attribute(user, "components")), false);
  assert.ok(attribute(user, "remarkPlugins"));
  assert.ok(attribute(user, "unwrapDisallowed"));
  assert.doesNotMatch(attribute(user, "allowedElements").getText(source), /["']a["']/);
});

test("assistant markdown retains its authenticated source-link renderer and streaming cursor", () => {
  const assistant = markdown.find((element) => !attribute(element, "allowedElements"));
  assert.ok(assistant);
  assert.match(attribute(assistant, "components").getText(source), /GuideSourceLink/);
  assert.match(attribute(assistant, "components").getText(source), /onOpenPdfViewer/);
  assert.ok(attribute(assistant, "remarkPlugins"));
  assert.ok(attribute(assistant, "rehypePlugins"));
});
