import type { ReactNode } from "react";

/** MS-417: marking the term a search matched, in two shapes — plain strings
 * (result titles, snippets, the user's own questions) and rendered markdown
 * (assistant answers, which reach the DOM as a tree, not a string).
 *
 * Both find the query with indexOf rather than a RegExp. The query is raw user
 * input, so `c++` would throw when compiled as a pattern and `8.` would match
 * any character at all. They also look for the query as one whole phrase
 * rather than word by word, because that is exactly what the backend's
 * `ILIKE '%q%'` matched on — highlighting per word would claim matches the
 * search itself never made.
 */

/** Every case-insensitive occurrence of `query` in `text`, wrapped in a span.
 * Returns the string untouched when there's nothing to mark, so callers can
 * drop it in place of the raw text. */
export function highlightMatch(text: string, query: string, className: string): ReactNode {
  const needle = query.trim().toLowerCase();
  if (!needle) return text;

  const haystack = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let at = haystack.indexOf(needle);

  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <span key={at} className={className}>
        {text.slice(at, at + needle.length)}
      </span>,
    );
    from = at + needle.length;
    at = haystack.indexOf(needle, from);
  }
  if (from === 0) return text;
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

// Minimal hast node shapes — enough to split a text node into marked parts
// without pulling in the unist typings (react-markdown keeps them internal).
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
}

/** The same marking, as a rehype plugin, for answers that go through
 * react-markdown. It runs on the parsed tree rather than the markdown source,
 * so it can't be confused by syntax — `**bold**` is already a node by this
 * point, and a match spanning it is simply never a single text node.
 *
 * Returns a *plugin*, not a transformer, hence the extra layer of function:
 * unified calls whatever it's handed to obtain the transformer, and only then
 * calls that with the tree. Handing it the transformer directly means unified
 * invokes it as the plugin instead — with no tree at all. */
export function rehypeHighlightMatch(query: string, className: string) {
  const needle = query.trim().toLowerCase();

  return () => (tree: HastNode) => {
    if (!needle) return;
    walk(tree);
  };

  function walk(node: HastNode) {
    if (!node.children?.length) return;
    // Code is left alone: splitting a token to paint part of it would make the
    // snippet read as something the answer never actually said.
    if (node.type === "element" && (node.tagName === "code" || node.tagName === "pre")) return;

    const rebuilt: HastNode[] = [];
    let marked = false;

    for (const child of node.children) {
      if (child.type === "text" && typeof child.value === "string") {
        const split = splitTextNode(child.value);
        if (split) {
          rebuilt.push(...split);
          marked = true;
          continue;
        }
      }
      walk(child);
      rebuilt.push(child);
    }

    if (marked) node.children = rebuilt;
  }

  function splitTextNode(value: string): HastNode[] | null {
    const haystack = value.toLowerCase();
    let at = haystack.indexOf(needle);
    if (at === -1) return null;

    const parts: HastNode[] = [];
    let from = 0;
    while (at !== -1) {
      if (at > from) parts.push({ type: "text", value: value.slice(from, at) });
      parts.push({
        type: "element",
        tagName: "mark",
        properties: { className: className.split(" ") },
        children: [{ type: "text", value: value.slice(at, at + needle.length) }],
      });
      from = at + needle.length;
      at = haystack.indexOf(needle, from);
    }
    if (from < value.length) parts.push({ type: "text", value: value.slice(from) });
    return parts;
  }
}

/** Shared look for a marked term, used everywhere a match is shown so the
 * thing you clicked in the results is the same thing you land on in the chat.
 *
 * A tint rather than colour alone: arriving mid-conversation, a few recoloured
 * words are a small target for an eye that just travelled. The fill sits on the
 * *word*, never the message — a highlighted block would read as "selected",
 * which is a state, and nothing here is selected.
 *
 * Carries no font weight on purpose. The match then always matches the weight
 * of the line it sits in — adding one would render a match inside an
 * already-bold title *lighter* than the title around it.
 *
 * `box-decoration-clone` keeps the padding and corners on both halves when a
 * match wraps across a line; `bg-primary/10` also overrides the yellow a
 * `mark` element gets from the browser by default. */
export const MATCH_MARK_CLASS =
  "bg-primary/10 text-primary rounded-sm px-0.5 box-decoration-clone";
