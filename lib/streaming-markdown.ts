const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
/** A list marker or heading mark with nothing after it yet. */
const BARE_MARKER = /^\s*(?:[-*+]|\d+[.)]|#{1,6})\s*$/;
const DELIMITER_ROW = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

/** The fence still open at the end of `lines`, as its opening marker, or null. */
function openFence(lines: string[]): string | null {
  let open: string | null = null;
  for (const line of lines) {
    const match = FENCE.exec(line);
    if (!match) continue;
    const [, marker, rest] = match;
    if (open === null) open = marker;
    else if (marker[0] === open[0] && marker.length >= open.length && rest.trim() === "") open = null;
  }
  return open;
}

const cellCount = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").length;

/** GFM only reads a header row as a table once the delimiter row under it has
 * the same number of cells. */
const startsTable = (header: string, delimiter: string | undefined) =>
  delimiter !== undefined && DELIMITER_ROW.test(delimiter) && cellCount(delimiter) === cellCount(header);

/** The lines of the last block that will not change shape when the next
 * characters arrive. */
function settledLines(block: string[]): string[] {
  if (block.length > 0 && block.every((line) => line.trimStart().startsWith("|"))) {
    // A table is a paragraph of pipes until its delimiter row is complete, then
    // it turns into a table: hold it back instead of showing it jump.
    if (!startsTable(block[0], block[1])) return [];
    const last = block[block.length - 1];
    return block.length > 2 && !last.trimEnd().endsWith("|") ? block.slice(0, -1) : block;
  }
  const last = block[block.length - 1];
  return last !== undefined && BARE_MARKER.test(last) ? block.slice(0, -1) : block;
}

/** The markdown of an answer that is still being written, made safe to render
 * while more is coming, so the message does not change shape underneath the
 * reader: an unclosed code fence is closed, and a table whose header or last
 * row is unfinished, or a bare list marker, is held back until it is complete.
 * Never use it on a finished answer. */
export function completeStreamingMarkdown(text: string): string {
  const lines = text.split("\n");
  const fence = openFence(lines);
  if (fence) return `${text}${text.endsWith("\n") ? "" : "\n"}${fence}`;

  let start = lines.length;
  while (start > 0 && lines[start - 1].trim() !== "") start--;
  return [...lines.slice(0, start), ...settledLines(lines.slice(start))].join("\n");
}
