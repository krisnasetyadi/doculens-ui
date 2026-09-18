import assert from "node:assert/strict";
import { test } from "node:test";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { docToMarkdown } from "../../../lib/editor-markdown";
import { insertComposerNewline } from "./composer-newline";

function createEditor(text: string) {
  const editor = new Editor({
    element: null,
    extensions: [StarterKit.configure({ trailingNode: false })],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  });
  editor.commands.setTextSelection(text.length + 1);
  return editor;
}

test("keeps the introduction outside a list started on the next line", (t) => {
  const editor = createEditor("Dibawah ini adalah bullet point");
  t.after(() => editor.destroy());

  insertComposerNewline(editor);
  editor.commands.insertContent({ type: "text", text: "a" });
  editor.commands.toggleBulletList();
  for (const text of ["b", "c", "d"]) {
    insertComposerNewline(editor);
    editor.commands.insertContent({ type: "text", text });
  }

  assert.equal(
    docToMarkdown(editor.getJSON()),
    "Dibawah ini adalah bullet point\n\n- a\n- b\n- c\n- d",
  );
});

test("can enable bullets on an empty new paragraph before typing", (t) => {
  const editor = createEditor("Introduction");
  t.after(() => editor.destroy());
  insertComposerNewline(editor);
  editor.commands.toggleBulletList();
  editor.commands.insertContent({ type: "text", text: "First item" });

  assert.equal(docToMarkdown(editor.getJSON()), "Introduction\n\n- First item");
});

test("an empty list item exits the list and preserves the preceding items", (t) => {
  const editor = createEditor("a");
  t.after(() => editor.destroy());
  editor.commands.toggleBulletList();
  insertComposerNewline(editor);
  insertComposerNewline(editor);
  editor.commands.insertContent({ type: "text", text: "Closing paragraph" });

  assert.equal(editor.isActive("listItem"), false);
  assert.equal(docToMarkdown(editor.getJSON()), "- a\n\nClosing paragraph");
});

test("a new line can become a quote without quoting its introduction", (t) => {
  const editor = createEditor("Introduction");
  t.after(() => editor.destroy());
  insertComposerNewline(editor);
  editor.commands.insertContent({ type: "text", text: "Quoted text" });
  editor.commands.toggleBlockquote();

  assert.equal(docToMarkdown(editor.getJSON()), "Introduction\n\n> Quoted text");
});

test("an empty quoted paragraph exits the quote", (t) => {
  const editor = createEditor("Quoted text");
  t.after(() => editor.destroy());
  editor.commands.toggleBlockquote();
  insertComposerNewline(editor);
  insertComposerNewline(editor);
  editor.commands.insertContent({ type: "text", text: "Outside quote" });

  assert.equal(editor.isActive("blockquote"), false);
  assert.equal(docToMarkdown(editor.getJSON()), "> Quoted text\n\nOutside quote");
});

test("splitting a paragraph in the middle preserves text and bold formatting", (t) => {
  const editor = createEditor("Intro item");
  t.after(() => editor.destroy());
  editor.commands.selectAll();
  editor.commands.toggleBold();
  editor.commands.setTextSelection(7);
  insertComposerNewline(editor);
  editor.commands.toggleBulletList();

  assert.equal(docToMarkdown(editor.getJSON()), "**Intro** \n\n- **item**");
});
