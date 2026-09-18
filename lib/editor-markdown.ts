import type { JSONContent } from "@tiptap/react";
import type { Nodes } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** MS-391: the composer's editor <-> the plain `string` every caller already
 * expects. Deliberately hand-rolled instead of pulling in a markdown
 * serializer, for one reason: every general-purpose serializer escapes
 * markdown punctuation, and DocuLens questions are full of pasted contract
 * text ("Section 7_2", "clause 5.1*"). An escaping serializer turns that into
 * "Section 7\_2" and ships corrupted text into the retrieval terms and the
 * prompt. Nothing here escapes anything — what was typed is what's sent.
 *
 * Only the node types the composer's StarterKit actually enables are handled
 * (see composer-editor.tsx). An unknown node falls back to its text content
 * rather than disappearing, so a future extension can't silently drop a
 * user's words. */

/** Markdown's hard line break: two trailing spaces. Needed because remark
 * renders a lone "\n" inside a paragraph as a space, so pasted hard breaks
 * would vanish when the question is rendered back in the message bubble. */
const HARD_BREAK = "  \n";

function serializeText(node: JSONContent): string {
  const raw = node.text ?? "";
  if (!node.marks?.length) return raw;

  // CommonMark won't close a mark's delimiter run right after whitespace, so
  // "**mengapa **" (a trailing space dragged into the selection before
  // toggling Bold) comes back as literal asterisks instead of bold text.
  // Keep leading/trailing whitespace outside every wrapper so what gets
  // wrapped is always non-whitespace at both ends.
  const [, leading, core, trailing] = raw.match(/^(\s*)([\s\S]*?)(\s*)$/) as RegExpMatchArray;
  if (!core) return raw;

  // Innermost first, so bold+italic reads ***x*** rather than **_*x*_**.
  const order = ["code", "italic", "bold"] as const;
  const wrappers: Record<(typeof order)[number], string> = { code: "`", italic: "*", bold: "**" };
  let out = core;
  for (const mark of order) {
    if (node.marks.some((m) => m.type === mark)) out = `${wrappers[mark]}${out}${wrappers[mark]}`;
  }
  return leading + out + trailing;
}

function serializeInline(content: JSONContent[] | undefined): string {
  if (!content) return "";
  return content
    .map((node) => {
      if (node.type === "text") return serializeText(node);
      if (node.type === "hardBreak") return HARD_BREAK;
      return serializeInline(node.content);
    })
    .join("");
}

/** Prefixes every line of an already-serialized block, for the constructs
 * whose marker has to repeat down the block (blockquote) or whose
 * continuation lines have to stay indented under their marker (list items). */
function prefixLines(block: string, first: string, rest: string): string {
  return block
    .split("\n")
    .map((line, i) => (i === 0 ? first + line : rest + line))
    .join("\n");
}

function serializeBlock(node: JSONContent): string {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.content);

    case "blockquote":
      return prefixLines(serializeBlocks(node.content), "> ", "> ");

    case "bulletList":
      return (node.content ?? [])
        .map((item) => prefixLines(serializeBlocks(item.content), "- ", "  "))
        .join("\n");

    case "orderedList": {
      const start = (node.attrs?.start as number | undefined) ?? 1;
      return (node.content ?? [])
        .map((item, i) => {
          const marker = `${start + i}. `;
          return prefixLines(serializeBlocks(item.content), marker, " ".repeat(marker.length));
        })
        .join("\n");
    }

    default:
      return serializeInline(node.content);
  }
}

function serializeBlocks(content: JSONContent[] | undefined): string {
  if (!content) return "";
  // Drop blocks that serialize to nothing (an empty paragraph) rather than
  // joining them in — StarterKit's TrailingNode leaves one of these after
  // almost anything, and joining an empty entry in would still leave a
  // blank-line gap wherever it sits, not just at the very end where the
  // final trim in docToMarkdown reaches.
  return content
    .map(serializeBlock)
    .filter(Boolean)
    .join("\n\n");
}

/** Editor document -> the markdown string sent to the API and stored as
 * `Message.content`. Trailing blank blocks are dropped so an empty editor
 * serializes to "" and the send button's `input.trim()` guard still works. */
export function docToMarkdown(doc: JSONContent): string {
  return serializeBlocks(doc.content).replace(/\s+$/, "");
}

/** The reverse direction, needed only for the two places the parent sets the
 * field from outside: clearing it, and dropping in a picked "/" command. Both
 * are plain text, so this deliberately does NOT parse markdown — it just
 * rebuilds paragraphs and line breaks. Parsing would mean a user's literal
 * "**" turning into bold on a round-trip they never asked for. */
export function plainTextToDoc(text: string): JSONContent {
  const paragraphs = text.split("\n\n");
  return {
    type: "doc",
    content: paragraphs.map((para) => {
      const lines = para.split("\n");
      const content: JSONContent[] = [];
      lines.forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return content.length ? { type: "paragraph", content } : { type: "paragraph" };
    }),
  };
}

/** Same parser stack the message bubble renders with (see chat-message.tsx),
 * so "the plain text of a question" is by definition the text a reader sees
 * in that bubble. Parsing rather than pattern-matching is the whole point: a
 * regex that unwraps `*...*` reads "bunga 2 * 3 * 4 persen" as an emphasis
 * and silently deletes the asterisks, while CommonMark knows a delimiter
 * surrounded by spaces opens nothing. Contract text is full of those. */
const markdownParser = unified().use(remarkParse).use(remarkGfm);

function nodeToPlainText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
    case "code":
      return node.value;

    // A markdown hard break is a line break in the rendered text.
    case "break":
      return "\n";

    case "image":
      return node.alt ?? "";

    // Blocks stacked by a blank line, matching how they read on screen.
    case "root":
    case "blockquote":
      return node.children.map(nodeToPlainText).join("\n\n");

    // One line per item, the marker itself dropped: it is the formatting,
    // not the user's words.
    case "list":
    case "listItem":
    case "table":
      return node.children.map(nodeToPlainText).join("\n");

    case "tableRow":
      return node.children.map(nodeToPlainText).join(" ");

    default:
      // Inline containers (paragraph, strong, emphasis, link, ...) join
      // seamlessly. Anything unrecognised falls back to its text rather than
      // vanishing, so a node type added later cannot silently drop words.
      if ("children" in node) return node.children.map(nodeToPlainText).join("");
      return "value" in node ? String(node.value) : "";
  }
}

/** MS-391: what the user sees formatted, the LLM must receive plain. The
 * composer stores markdown so the bubble can render it, but that string is
 * never what gets sent: markdown punctuation reaching the backend ends up
 * inside the prompt and, worse, inside the embedded query, where it shifts
 * the vector enough to change which chunks are retrieved. Everything bound
 * for the API goes through here first. */
export function markdownToPlainText(markdown: string): string {
  return nodeToPlainText(markdownParser.parse(markdown)).replace(/\s+$/, "");
}

/** MS-391: the sidebar's recent list and the navigation rail's tooltip are
 * single-line plain-text labels, so they need the same conversion collapsed
 * onto one line. */
export function stripMarkdown(text: string): string {
  return markdownToPlainText(text).replace(/\s+/g, " ").trim();
}
