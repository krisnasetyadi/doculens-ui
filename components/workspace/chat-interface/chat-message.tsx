import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PdfSourceInfo } from "@/services";
import { isStoppedNote, type Message } from "./chat-types";
import { SourcesSection } from "./sources-section";
import { EfficiencyBadge } from "@/components/efficiency-popup";
import { highlightMatch, rehypeHighlightMatch, MATCH_MARK_CLASS } from "@/lib/highlight-match";
import { rehypeStreamingCursor } from "@/lib/rehype-streaming-cursor";
import { completeStreamingMarkdown } from "@/lib/streaming-markdown";
import { IconButton } from "@/components/icon-button";

// Keep formatted blocks on the app's theme in both message roles; prose's
// neutral defaults use a dark code surface and a faint quote border.
const CHAT_MARKDOWN_BLOCK_CLASSES = [
  "prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-primary/15 prose-pre:p-3 prose-pre:font-[family-name:ui-monospace,monospace] prose-pre:text-[12px] prose-pre:text-foreground prose-pre:bg-muted",
  "prose-blockquote:border-l-[3px] prose-blockquote:border-primary/60 prose-blockquote:pl-3 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-foreground",
  "[&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none",
].join(" ");

export interface ChatMessageProps {
  message: Message;
  isRegenerating: boolean;
  /** MS-667: false while another answer in this chat is being generated —
   * one answer at a time, so Stop always cancels the right one. */
  canRegenerate: boolean;
  onCopy: (content: string) => void;
  onRegenerate: (assistantId: string) => void;
  onOpenPdfViewer: (s: PdfSourceInfo) => void;
  // MS-417: set only on the message a search result jumped to — the term that
  // matched, marked here so arriving mid-thread says why you landed on it.
  // The jump itself deliberately adds no ring around the message (see
  // chat-interface.tsx), so this mark is the whole of the arrival cue.
  highlightQuery?: string;
  /** MS-906: the answer is still being written. Its text is shown as it is so
   * far, with a cursor at the end and no actions yet; until the first piece of
   * text arrives there is a spinner instead. */
  streaming?: boolean;
}

export function ChatMessage({
  message,
  isRegenerating,
  canRegenerate,
  onCopy,
  onRegenerate,
  onOpenPdfViewer,
  highlightQuery,
  streaming = false,
}: ChatMessageProps) {
  // A question is stored and shown as plain text, so it can be split directly.
  // An answer is markdown and reaches the DOM as a tree, so it gets marked
  // during rendering instead — same matching either way.
  const rehypePlugins = highlightQuery?.trim()
    ? [rehypeHighlightMatch(highlightQuery, MATCH_MARK_CLASS)]
    : [];

  return (
    <section className="space-y-6">
      {message.role === "user" && (
        <div className="flex items-start justify-end gap-3 pl-[60px] max-[620px]:pl-6 max-[620px]:gap-2">
          {/* MS-391: questions are markdown now, so the bubble has to render
              it — left as plain text, a bolded prompt would show its literal
              asterisks. Deliberately a narrower set of marks than the answer
              below: the composer can only produce these, and a question that
              could emit headings, images, or code blocks would let a pasted
              document restyle the thread. "pre" is excluded on purpose, not
              just left off the composer's toolbar: the composer can't create
              a codeBlock node, but a question's raw text can still contain
              the literal characters of a fenced block (pasted, or typed) —
              excluding it here is what stops that text rendering as one. */}
          <div className="min-w-0 max-w-[78%] bg-accent border border-selected rounded-xl rounded-br-sm px-4 py-[11px] max-[620px]:max-w-[84%] max-[620px]:px-[13px] max-[620px]:py-2.5">
            <div className={`font-inter text-sm text-foreground leading-[1.55] prose prose-neutral dark:prose-invert max-w-none prose-p:my-0 prose-p:text-sm prose-p:leading-[1.55] prose-strong:text-foreground prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-blockquote:my-1 [&_code]:before:content-none [&_code]:after:content-none [--tw-prose-bullets:var(--foreground)] [--tw-prose-invert-bullets:var(--foreground)] ${CHAT_MARKDOWN_BLOCK_CLASSES}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                allowedElements={[
                  "p", "br", "strong", "em", "code",
                  "ul", "ol", "li", "blockquote",
                ]}
                unwrapDisallowed
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
          <Avatar className="size-9 shrink-0 max-[620px]:size-[31px]">
            <AvatarFallback className="bg-selected text-primary-pressed dark:bg-primary/15 dark:text-primary">
              <span className="material-symbols-outlined text-sm">person</span>
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {isStoppedNote(message) && (
        // MS-667: in place of an answer the user stopped. Muted, not an
        // error; Regenerate asks the same question again.
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] italic font-inter text-muted-foreground">Stopped</span>
          <IconButton
            size="sm"
            label="Regenerate response"
            onClick={() => onRegenerate(message.id)}
            loading={isRegenerating}
            disabled={!canRegenerate}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      )}
      {message.role === "assistant" && !isStoppedNote(message) && (
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-center space-x-2 text-primary-hover dark:text-primary">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="text-[11px] font-extrabold tracking-[0.12em] uppercase font-manrope">Synthesized Intelligence</span>
          </div>
          {streaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-inter text-muted-foreground">Synthesizing intelligence…</span>
            </div>
          ) : (
            <div className={`font-inter text-[15px] text-foreground leading-[1.7] prose prose-neutral dark:prose-invert max-w-none prose-headings:font-manrope prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5 ${CHAT_MARKDOWN_BLOCK_CLASSES}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={streaming ? [rehypeStreamingCursor("streaming-cursor")] : []}
              >
                {streaming ? completeStreamingMarkdown(message.content) : message.content}
              </ReactMarkdown>
            </div>
          )}
          {!streaming && (
            <div className="flex items-center gap-1.5 pt-1.5">
              <IconButton
                size="sm"
                label="Copy message"
                onClick={() => onCopy(message.content)}
              >
                <Copy className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                label="Regenerate response"
                onClick={() => onRegenerate(message.id)}
                loading={isRegenerating}
                disabled={!canRegenerate}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </IconButton>
              {message.modelUsed && (
                <span className="ml-1.5 text-[10px] font-bold font-manrope uppercase tracking-[0.1em] text-muted-foreground/70">{message.modelUsed}</span>
              )}
              {message.sources?.processing_time && (
                <span className="text-[11px] text-muted-foreground/70">{message.sources.processing_time.toFixed(2)}s</span>
              )}
              {message.efficiency?.enabled && <EfficiencyBadge stats={message.efficiency} />}
            </div>
          )}
          {message.sources && <SourcesSection message={message} onOpenPdfViewer={onOpenPdfViewer} />}
        </div>
      )}
    </section>
  );
}
