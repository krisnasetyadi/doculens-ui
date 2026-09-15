import assert from "node:assert/strict";
import { test } from "node:test";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { docToMarkdown, markdownToPlainText } from "./editor-markdown";

test("drops the formatting and keeps the words", () => {
  assert.equal(markdownToPlainText("**Bandingkan** klausul 7.2"), "Bandingkan klausul 7.2");
  assert.equal(markdownToPlainText("harga *naik* jadi `Rp5.000`"), "harga naik jadi Rp5.000");
});

// The reason this is a parser and not a regex. Each of these loses characters
// to a pattern that unwraps `*...*` on sight, and they are exactly the kind of
// string a DocuLens question is made of.
test("leaves punctuation that only looks like formatting alone", () => {
  assert.equal(markdownToPlainText("bunga 2 * 3 * 4 persen"), "bunga 2 * 3 * 4 persen");
  assert.equal(markdownToPlainText("5 * 3 = 15 dan 10 * 2 = 20"), "5 * 3 = 15 dan 10 * 2 = 20");
  assert.equal(markdownToPlainText("a ** b ** c"), "a ** b ** c");
  assert.equal(markdownToPlainText("Section 7_2 dan clause 5.1*"), "Section 7_2 dan clause 5.1*");
});

test("keeps list items on their own lines without the markers", () => {
  assert.equal(markdownToPlainText("- satu\n- dua\n- tiga"), "satu\ndua\ntiga");
  assert.equal(markdownToPlainText("1. pertama\n2. kedua"), "pertama\nkedua");
});

test("preserves paragraph and line structure", () => {
  assert.equal(markdownToPlainText("paragraf satu\n\nparagraf dua"), "paragraf satu\n\nparagraf dua");
  assert.equal(markdownToPlainText("baris satu  \nbaris dua"), "baris satu\nbaris dua");
});

test("unwraps quotes and code fences but keeps their contents verbatim", () => {
  assert.equal(markdownToPlainText("> kutipan\n> lanjutan"), "kutipan\nlanjutan");
  assert.equal(markdownToPlainText("```sql\nSELECT * FROM users;\n```"), "SELECT * FROM users;");
});

test("a question typed without formatting is passed through untouched", () => {
  const plain = "Apa syarat pembayaran termin kedua?";
  assert.equal(markdownToPlainText(plain), plain);
});

// The contract end to end: one thing typed, two representations out. The
// bubble keeps the formatting, the API call never sees it.
test("bolding a word changes the stored message but not the text sent", (t) => {
  const editor = new Editor({
    element: null,
    extensions: [StarterKit.configure({ trailingNode: false })],
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Apa syarat pembayaran termin kedua?" }] },
      ],
    },
  });
  t.after(() => editor.destroy());

  editor.commands.setTextSelection({ from: 12, to: 22 });
  editor.commands.toggleBold();

  const stored = docToMarkdown(editor.getJSON());
  assert.equal(stored, "Apa syarat **pembayaran** termin kedua?");
  assert.equal(markdownToPlainText(stored), "Apa syarat pembayaran termin kedua?");
});
