export const MAX_SKILL_FILE_SIZE = 256 * 1024;

export interface ParsedSkillMarkdown {
  name: string;
  slash_command: string;
  description: string;
  instruction: string;
}

const METADATA_FIELDS = new Set(["name", "command", "slash_command", "description"]);

export function validateSkillFile(file: { name: string; size: number }): void {
  if (!/\.md$/i.test(file.name)) {
    throw new Error("Please choose a Markdown (.md) file.");
  }
  if (file.size > MAX_SKILL_FILE_SIZE) {
    throw new Error("Skill file is too large. Choose a file no larger than 256 KB.");
  }
}

function metadataError(field: string): Error {
  return new Error(`Invalid ${field} in the file's frontmatter. Use a text value.`);
}

function parseScalar(value: string, field: string): string {
  const text = value.trim();
  if (text.startsWith('"')) {
    const quoted = text.match(/^"(?:[^"\\]|\\.)*"/);
    if (!quoted || !/^(?:\s*#.*)?$/.test(text.slice(quoted[0].length))) {
      throw metadataError(field);
    }
    try {
      return JSON.parse(quoted[0]) as string;
    } catch {
      throw metadataError(field);
    }
  }
  if (text.startsWith("'")) {
    const quoted = text.match(/^'(?:[^']|'')*'/);
    if (!quoted || !/^(?:\s*#.*)?$/.test(text.slice(quoted[0].length))) {
      throw metadataError(field);
    }
    return quoted[0].slice(1, -1).replace(/''/g, "'");
  }
  if (/^[\[\]{}&*!>|]/.test(text)) throw metadataError(field);
  return text.replace(/(?:^|\s+)#.*$/, "").trim();
}

function parseBlock(lines: string[], folded: boolean, field: string): string {
  const firstContent = lines.find((line) => line.trim());
  if (!firstContent) return "";
  const indent = firstContent.match(/^ +/)?.[0].length;
  if (!indent) throw metadataError(field);

  const content = lines.map((line) => {
    if (!line.trim()) return "";
    if (!line.startsWith(" ".repeat(indent))) throw metadataError(field);
    return line.slice(indent);
  });
  if (!folded) return content.join("\n").trim();

  // YAML's common folded form joins paragraph lines and preserves blank lines
  // and more-indented examples. Metadata is trimmed before being sent to the API.
  let result = "";
  for (let index = 0; index < content.length; index += 1) {
    const line = content[index];
    const next = content[index + 1];
    result += line;
    if (next === undefined) continue;
    if (line && next && !/^\s/.test(line) && !/^\s/.test(next)) result += " ";
    else if (line || !next || /^\s/.test(next)) result += "\n";
  }
  return result.trim();
}

/** Read the flat text fields used by a skill; unrelated frontmatter is ignored.
 * Keeping instruction Markdown as text also avoids rendering uploaded HTML. */
export function parseSkillMarkdown(source: string, fileName: string): ParsedSkillMarkdown {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const metadata: Record<string, string> = {};
  let instruction = text;

  if (/^---[ \t]*$/.test(lines[0])) {
    const closingIndex = lines.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line));
    if (closingIndex === -1) {
      throw new Error("The file's frontmatter is missing its closing --- line.");
    }

    for (let index = 1; index < closingIndex; index += 1) {
      const line = lines[index];
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const field = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!field) {
        throw new Error("Invalid frontmatter. Write each field as name: value.");
      }
      const key = field[1].toLowerCase();
      const continuation: string[] = [];
      while (index + 1 < closingIndex && (!lines[index + 1].trim() || /^[ \t]/.test(lines[index + 1]))) {
        continuation.push(lines[++index]);
      }
      if (!METADATA_FIELDS.has(key)) continue;
      if (Object.hasOwn(metadata, key)) {
        throw new Error(`The file's frontmatter contains more than one ${key} field.`);
      }

      const block = field[2].match(/^([|>])[+-]?(?:\s+#.*)?\s*$/);
      if (block) {
        metadata[key] = parseBlock(continuation, block[1] === ">", key);
      } else {
        if (continuation.some((entry) => entry.trim() && !/^\s*#/.test(entry))) {
          throw new Error(`Use | or > for a multiline ${key} in the file's frontmatter.`);
        }
        metadata[key] = parseScalar(field[2], key);
      }
    }
    instruction = lines.slice(closingIndex + 1).join("\n");
  }

  const name = metadata.name?.trim() || fileName.replace(/\.md$/i, "").trim() || "Untitled skill";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const command = (metadata.command || metadata.slash_command || slug || "skill").trim().replace(/^\/+/, "");
  if (!command) throw new Error("The skill's command must contain text after the slash.");
  if (!instruction.trim()) {
    throw new Error("This file has no instructions. Add Markdown text below the frontmatter.");
  }

  return {
    name,
    slash_command: `/${command}`,
    description: metadata.description?.trim() || "",
    instruction: instruction.trim(),
  };
}
