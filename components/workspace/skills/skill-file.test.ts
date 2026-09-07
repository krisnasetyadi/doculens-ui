import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_SKILL_FILE_SIZE, parseSkillMarkdown, validateSkillFile } from "./skill-file";

test("accepts Markdown files up to the reference upload limit", () => {
  assert.doesNotThrow(() => validateSkillFile({ name: "SKILL.MD", size: MAX_SKILL_FILE_SIZE }));
  assert.throws(() => validateSkillFile({ name: "skill.txt", size: 10 }), /Markdown/);
  assert.throws(() => validateSkillFile({ name: "skill.md", size: MAX_SKILL_FILE_SIZE + 1 }), /256 KB/);
});

test("plain Markdown derives its name and command from the filename", () => {
  assert.deepEqual(parseSkillMarkdown("\n# Review\n\nCite source evidence.\n", "Review Evidence.md"), {
    name: "Review Evidence",
    slash_command: "/review-evidence",
    description: "",
    instruction: "# Review\n\nCite source evidence.",
  });
});

test("parses quoted scalars, comments, BOM and Windows line endings", () => {
  const parsed = parseSkillMarkdown("\uFEFF---\r\nname: 'Team''s audit' # title\r\ncommand: \"//audit\"\r\ndescription: \"Review #1: \\\"Evidence\\\"\"\r\n---\r\nCheck every clause.\r\n", "SKILL.md");
  assert.deepEqual(parsed, {
    name: "Team's audit",
    slash_command: "/audit",
    description: 'Review #1: "Evidence"',
    instruction: "Check every clause.",
  });
});

test("supports slash_command alias and preserves hashes inside unquoted text", () => {
  const parsed = parseSkillMarkdown("---\nname: Audit\nslash_command: clause#1 # comment\ndescription: Check clause # comment\n---\nReview.", "audit.md");
  assert.equal(parsed.slash_command, "/clause#1");
  assert.equal(parsed.description, "Check clause");
});

test("folds multiline descriptions while retaining paragraphs", () => {
  const parsed = parseSkillMarkdown("---\nname: Audit\ndescription: >-\n  Review each clause\n  and cite the evidence.\n\n  Include any missing documents.\n---\nReview.", "audit.md");
  assert.equal(parsed.description, "Review each clause and cite the evidence.\nInclude any missing documents.");
});

test("retains newlines in literal descriptions and ignores unrelated metadata", () => {
  const parsed = parseSkillMarkdown("---\nname: Audit\nmetadata:\n  author: Team\nallowed-tools: [Read, Search]\ndescription: |\n  First line.\n  Second line.\n---\nReview.\n\n---\n\nMore instructions.", "audit.md");
  assert.equal(parsed.description, "First line.\nSecond line.");
  assert.equal(parsed.instruction, "Review.\n\n---\n\nMore instructions.");
});

test("rejects empty instructions, including metadata-only files", () => {
  assert.throws(() => parseSkillMarkdown(" \n ", "empty.md"), /no instructions/);
  assert.throws(() => parseSkillMarkdown("---\nname: Audit\n---", "empty.md"), /no instructions/);
});

test("rejects missing delimiters, duplicate fields and malformed text values", () => {
  assert.throws(() => parseSkillMarkdown("---\nname: Audit\nReview.", "audit.md"), /closing ---/);
  assert.throws(() => parseSkillMarkdown("---\nname: Audit\nname: Duplicate\n---\nReview.", "audit.md"), /more than one name/);
  for (const value of ['"Unclosed', "'Unclosed", "[Audit]", "{name: Audit}", '"Audit" trailing']) {
    assert.throws(() => parseSkillMarkdown(`---\nname: ${value}\n---\nReview.`, "audit.md"), /Invalid name/);
  }
});

test("rejects invalid slash commands and unmarked multiline values", () => {
  assert.throws(() => parseSkillMarkdown("---\ncommand: ///\n---\nReview.", "audit.md"), /command must contain text/);
  assert.throws(() => parseSkillMarkdown("---\ndescription: First line\n  Continuation\n---\nReview.", "audit.md"), /Use \| or >/);
});

test("uses safe fallback names and commands for non-Latin filenames", () => {
  assert.equal(parseSkillMarkdown("Review.", "監査.md").slash_command, "/skill");
  assert.equal(parseSkillMarkdown("Review.", ".md").name, "Untitled skill");
});
