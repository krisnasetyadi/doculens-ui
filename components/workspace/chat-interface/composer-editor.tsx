"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, Extension, useEditor, type Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Code, Italic, List, Quote } from "lucide-react";
import { docToMarkdown, plainTextToDoc } from "@/lib/editor-markdown";
import type { SlashCommand } from "./chat-types";
import { insertComposerNewline } from "./composer-newline";

interface ComposerEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter (no Shift). The editor never submits by itself when the message is
   * empty or the parent says it can't send right now. */
  onSubmit: () => void;
  /** Escape while the "/" menu is open — same "clear the field" behaviour the
   * plain input had, kept as a prop so the menu's open/closed state stays the
   * parent's business. */
  onEscape: () => void;
  canSubmit: boolean;
  /** Every command the "/" chip may light up for: the static list plus this
   * account's Skills. */
  commands: SlashCommand[];
  placeholder: string;
  /** The send button. Rendered beside the text rather than by the caller's
   * own flex row, because the toolbar has to span the full width *under*
   * both of them — a toolbar that stops short of the send button reads as
   * belonging to the text only. */
  children: React.ReactNode;
}

/** MS-391: lights up a leading "/command" the way the old transparent-input
 * overlay did, but as a real ProseMirror decoration — so it survives wrapping,
 * multiple lines and scrolling for free, none of which the overlay could do
 * without mirroring the field's exact metrics. The Radix tooltip the overlay
 * used can't wrap a decoration, so the description moves to a native `title`.
 *
 * Only ever decorates the document's first block: "/gap-check" is a command
 * when the message opens with it, and nothing but ordinary text anywhere else. */
function slashChipExtension(getCommands: () => SlashCommand[]) {
  return Extension.create({
    name: "slashCommandChip",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("slashCommandChip"),
          props: {
            decorations(state) {
              const first = state.doc.firstChild;
              if (!first || !first.isTextblock) return null;
              const text = first.textContent;
              if (!text.startsWith("/")) return null;
              const token = text.split(/\s/)[0];
              const match = getCommands().find((c) => c.command === token);
              if (!match) return null;
              // The doc opens at 0 and its first textblock's content starts at 1.
              return DecorationSet.create(state.doc, [
                Decoration.inline(1, 1 + token.length, {
                  class: "slash-chip",
                  title: match.description,
                }),
              ]);
            },
          },
        }),
      ];
    },
  });
}

/** Toolbar buttons must not steal focus: a click that blurs the editor would
 * collapse the selection the command is about to act on, and would also hide
 * the toolbar itself (it's shown while focused). Suppressing mousedown keeps
 * the caret exactly where the user left it. */
function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-7 h-6 flex items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground/70 hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // The editor mutates in place, so React needs a nudge to re-read
  // isActive() after every transaction — otherwise the pressed states
  // only refresh when some other prop happens to change.
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-border/60">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      {/* Hidden on phones: at 375px it would either push the buttons out of
          the row or wrap the toolbar onto two lines, and the shortcut it
          names isn't reachable on a touch keyboard anyway. */}
      <span className="ml-auto pr-1 text-[10px] font-['Inter'] text-muted-foreground/40 whitespace-nowrap hidden sm:inline">
        Enter to send · Shift+Enter for new line
      </span>
    </div>
  );
}

export function ComposerEditor({
  value,
  onChange,
  onSubmit,
  onEscape,
  canSubmit,
  commands,
  placeholder,
  children,
}: ComposerEditorProps) {
  const [focused, setFocused] = useState(false);

  // Handlers are read through refs inside the editor's own keymap, which is
  // built once. Without this the keymap would close over the first render's
  // props and keep submitting with a stale `canSubmit`.
  const submitRef = useRef(onSubmit);
  const escapeRef = useRef(onEscape);
  const canSubmitRef = useRef(canSubmit);
  const commandsRef = useRef(commands);
  submitRef.current = onSubmit;
  escapeRef.current = onEscape;
  canSubmitRef.current = canSubmit;
  commandsRef.current = commands;

  // The last string this component handed upward. `value` is the parent's
  // state, so it echoes straight back on the next render; comparing against
  // what we emitted is how an external set (clear, or a picked "/" command)
  // is told apart from that echo. Without it, every keystroke would re-set
  // the document and throw the caret to the end.
  const emittedRef = useRef(value);

  const editor = useEditor({
    // Next renders this on the server first; letting Tiptap paint immediately
    // would hand React a tree the client then disagrees with.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Deliberately narrow: a question box is not a document editor, and
        // every block type enabled here is one more thing that can be pasted
        // in and then fail to survive the trip through markdown.
        heading: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
        // TrailingNode auto-appends an empty paragraph whenever the last
        // node isn't one already — meant for "click below the table to keep
        // writing" in a real document. Here it fires the moment a list or
        // code block is toggled on, tacking dead blank space onto an
        // otherwise-empty composer (an empty code block still shows its own
        // placeholder at its own top, correctly, but this extra paragraph
        // sits below it, making the box taller than its one line of
        // content for no reason a user asked for). Exiting a code block
        // (ArrowDown) and a list (Shift-Enter on an empty
        // item, see the keymap below) both already work without it.
        trailingNode: false,
      }),
      Placeholder.configure({ placeholder }),
      slashChipExtension(() => commandsRef.current),
      Extension.create({
        name: "composerKeymap",
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              // An IME candidate is committed with Enter. Sending here would
              // fire the message mid-word for anyone typing Japanese, Korean
              // or Chinese, so let the composition finish first.
              if (this.editor.view.composing) return false;
              if (canSubmitRef.current) submitRef.current();
              // Handled either way: a blocked send must not fall through to
              // ProseMirror and split the paragraph instead.
              return true;
            },
            "Shift-Enter": () => insertComposerNewline(this.editor),
            Escape: () => {
              escapeRef.current();
              return true;
            },
          };
        },
      }),
    ],
    editorProps: {
      attributes: {
        // AC: grows with its content, stops at a ceiling, then scrolls. The
        // ceiling matches the Home hero input's own max-h-40 so the two
        // fields behave identically. Unlike the hero's `field-sizing-content`
        // (Chromium-only, and silently a one-line box in Firefox and Safari),
        // a contenteditable is laid out by its content everywhere.
        class: [
          "w-full max-h-40 overflow-y-auto custom-scrollbar outline-none",
          // px-3 matches the base Input component's own default inset (see
          // components/ui/input.tsx) — a contenteditable has no UA-stylesheet
          // padding of its own the way a native <input> does, so matching the
          // same class here isn't quite the same amount of visual breathing
          // room; px-3 is the value that actually looks equivalent.
          "text-sm font-['Inter'] text-foreground leading-relaxed py-2.5 px-3",
          // ProseMirror renders its own DOM, so the block styles live here as
          // arbitrary variants rather than in a stylesheet.
          "[&>*]:my-0 [&>*+*]:mt-2",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-0 [&_li]:my-0.5 [&_li>p]:my-0",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-0",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          // A <pre> defaults to white-space: pre, so pasted prose would sit on
          // one endless line and scroll sideways inside a box only 10rem tall.
          // pre-wrap keeps the newlines that make it a code block while still
          // wrapping at the edge; break-words catches a single token longer
          // than the field, which wrapping alone cannot place.
          "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-2.5 [&_pre]:text-[12px] [&_pre]:font-mono [&_pre]:whitespace-pre-wrap [&_pre]:break-words",
          "[&_code]:font-mono [&_code]:text-[12px]",
          "[&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:rounded [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5",
          "[&_.slash-chip]:bg-primary/15 [&_.slash-chip]:text-primary [&_.slash-chip]:rounded-md [&_.slash-chip]:font-medium",
          // Placeholder marks the first node when the document is empty.
          // Tiptap's own recipe floats it at height 0 so it adds no layout,
          // which silently clips it the moment it wraps — at 375px this
          // placeholder is two lines and lost its second one. Taking it out
          // of flow absolutely keeps the box one line tall and ellipsises
          // instead of cutting mid-word. Positioned against the empty
          // block itself (not the root) so the pseudo-element's text
          // stays glued to the real cursor — an earlier version centered it
          // against the root instead, which moved the *visible* placeholder
          // to the middle of a tall box while the real (invisible) caret,
          // laid out in normal flow, stayed at the top: cursor and
          // placeholder text ended up on different lines. Centering the
          // whole line — caret included — is the root's job (see above).
          "[&_.is-editor-empty:first-child]:relative",
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground/40",
          "[&_.is-editor-empty:first-child::before]:absolute",
          "[&_.is-editor-empty:first-child::before]:inset-x-0",
          "[&_.is-editor-empty:first-child::before]:top-0",
          "[&_.is-editor-empty:first-child::before]:truncate",
          "[&_.is-editor-empty:first-child::before]:pointer-events-none",
          // Match the pre's padding so the placeholder shares the caret's
          // content inset instead of sitting at the code block's outer edge.
          "[&_pre.is-editor-empty:first-child::before]:inset-x-2.5",
          "[&_pre.is-editor-empty:first-child::before]:top-2.5",
        ].join(" "),
      },
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onUpdate: ({ editor: e }) => {
      const markdown = docToMarkdown(e.getJSON());
      emittedRef.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor || value === emittedRef.current) return;
    emittedRef.current = value;
    editor.commands.setContent(plainTextToDoc(value), { emitUpdate: false });
    // A picked "/" command arrives as "/gap-check " and the user's next
    // keystroke belongs after it, not wherever the caret happened to sit.
    if (value) editor.commands.focus("end");
  }, [editor, value]);

  // Shown while the field is focused or holds anything, so the resting empty
  // composer is exactly as quiet as it was before this ticket — but the
  // toolbar is there from the first click, not after some line-count
  // threshold nobody would discover.
  const showToolbar = Boolean(editor) && (focused || value.length > 0);

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 p-2">
        {/* min-w-0 so a long unbroken paste wraps instead of widening the
            flex row and pushing the send button off the edge. flex-col +
            justify-center centers the editor (cursor included — it's a
            single unit here, not just the placeholder text) when something
            outside this component stretches the row taller than one line
            of content. Deliberately done here and not with justify-content
            on the scrollable ProseMirror element itself: this wrapper never
            scrolls, so plain `center` (no `safe` fallback needed) can't
            trap the first lines of a long, overflowing message out of
            scroll reach the way it could on the element that does. */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <EditorContent editor={editor} />
        </div>
        {children}
      </div>
      {editor && showToolbar && <Toolbar editor={editor} />}
    </div>
  );
}
