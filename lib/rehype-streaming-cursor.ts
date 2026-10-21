interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
}

const BLOCKS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "table", "hr", "div",
]);
/** Blocks the cursor cannot sit inside; it goes on a line of its own after them. */
const NO_CURSOR = new Set(["pre", "table", "hr"]);

const isBlank = (node: HastNode) => node.type === "text" && !node.value?.trim();

/** The element the cursor goes at the end of: the deepest block whose last
 * child is inline content, so the cursor sits right after the last character
 * instead of on a line of its own. Null when the answer ends in a block that
 * cannot hold it (a code block, a table, a rule). */
function cursorHost(parent: HastNode): HastNode | null {
  const last = [...(parent.children ?? [])].reverse().find((child) => !isBlank(child));
  if (!last || last.type !== "element" || !last.tagName || !BLOCKS.has(last.tagName)) return parent;
  return NO_CURSOR.has(last.tagName) ? null : cursorHost(last);
}

/** A rehype plugin that puts a cursor at the end of an answer that is still
 * being written. The element is empty and decorative, so it is hidden from
 * assistive technology; `className` is what styles it. */
export function rehypeStreamingCursor(className: string) {
  return () => (tree: HastNode) => {
    const cursor: HastNode = {
      type: "element",
      tagName: "span",
      properties: { className: [className], ariaHidden: "true" },
      children: [],
    };
    const host = cursorHost(tree);
    if (host) host.children?.push(cursor);
    else tree.children?.push({ type: "element", tagName: "p", properties: {}, children: [cursor] });
  };
}
