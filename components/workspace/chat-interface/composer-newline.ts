import type { Editor } from "@tiptap/react";

/** Starts an independently formattable block while preserving list editing. */
export function insertComposerNewline(editor: Editor): boolean {
  if (editor.isActive("listItem")) {
    const { empty, $from } = editor.state.selection;
    if (empty && $from.parent.content.size === 0) {
      return editor.commands.liftListItem("listItem");
    }
    return editor.commands.splitListItem("listItem");
  }

  // A hard break keeps both lines in one paragraph, so toggling a list or
  // quote would also format the preceding line. Use the rich-text block
  // commands, including lifting an empty paragraph out of a quote.
  return editor.commands.first(({ commands }) => [
    () => commands.createParagraphNear(),
    () => commands.liftEmptyBlock(),
    () => commands.splitBlock(),
  ]);
}
