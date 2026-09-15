import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RotateCcw, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PdfSourceInfo } from "@/services";
import type { Message } from "./chat-types";
import { SourcesSection } from "./sources-section";
import { EfficiencyBadge } from "@/components/efficiency-popup";

// Keep formatted blocks on the app's theme in both message roles; prose's
// neutral defaults use a dark code surface and a faint quote border.
const CHAT_MARKDOWN_BLOCK_CLASSES = [
  "prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-primary/15 prose-pre:p-3 prose-pre:font-[family-name:ui-monospace,monospace] prose-pre:text-[12px] prose-pre:text-foreground prose-pre:bg-muted",
  "prose-blockquote:border-l-[3px] prose-blockquote:border-primary/60 prose-blockquote:pl-3 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-foreground",
  "[&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none",
].join(" ");

interface ChatMessageProps {
  message: Message;
  isRegenerating: boolean;
  onCopy: (content: string) => void;
  onRegenerate: (assistantId: string) => void;
  onOpenPdfViewer: (s: PdfSourceInfo) => void;
}

export function ChatMessage({ message, isRegenerating, onCopy, onRegenerate, onOpenPdfViewer }: ChatMessageProps) {
  return (
    <section className="space-y-6">
      {message.role === "user" && (
        <div className="flex items-start justify-end gap-3">
          {/* MS-391: questions are markdown now, so the bubble has to render
              it — left as plain text, a bolded prompt would show its literal
              asterisks. Deliberately a narrower set of marks than the answer
              below: the composer can only produce these, and a question that
              could emit headings or images would let a pasted document
              restyle the thread.
              Its code blocks wrap, which the answer's below deliberately do
              not: what lands in a question is usually pasted prose, and a
              paragraph on one sideways-scrolling line is unreadable, while
              real code in an answer reads better on unbroken lines. */}
          <div className="min-w-0 max-w-[75%] bg-primary/10 border border-primary/15 rounded-2xl px-5 py-3">
            <div className={`font-['Inter'] text-base text-foreground leading-snug prose prose-neutral dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-snug prose-strong:text-foreground prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-blockquote:my-1 prose-pre:my-1.5 [&_code]:before:content-none [&_code]:after:content-none [--tw-prose-bullets:var(--foreground)] [--tw-prose-invert-bullets:var(--foreground)] prose-pre:whitespace-pre-wrap prose-pre:break-words ${CHAT_MARKDOWN_BLOCK_CLASSES}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                allowedElements={[
                  "p", "br", "strong", "em", "code", "pre",
                  "ul", "ol", "li", "blockquote",
                ]}
                unwrapDisallowed
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
          <Avatar className="mt-1 w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary">
              <span className="material-symbols-outlined text-sm">person</span>
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {message.role === "assistant" && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-primary mb-1">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase font-['Manrope']">Synthesized Intelligence</span>
          </div>
          <div className={`font-['Inter'] text-base text-foreground leading-relaxed prose prose-neutral dark:prose-invert max-w-none prose-headings:font-['Manrope'] prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5 ${CHAT_MARKDOWN_BLOCK_CLASSES}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onCopy(message.content)}
              title="Copy"
              aria-label="Copy message"
              className="w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onRegenerate(message.id)}
              disabled={isRegenerating}
              title="Regenerate"
              aria-label="Regenerate response"
              className="w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </button>
            {message.modelUsed && (
              <span className="text-[11px] font-bold font-['Manrope'] uppercase tracking-[0.2em] text-muted-foreground/50">{message.modelUsed}</span>
            )}
            {message.sources?.processing_time && (
              <span className="text-[10px] text-muted-foreground/40">{message.sources.processing_time.toFixed(2)}s</span>
            )}
            {message.efficiency?.enabled && <EfficiencyBadge stats={message.efficiency} />}
          </div>
          {message.sources && <SourcesSection message={message} onOpenPdfViewer={onOpenPdfViewer} />}
        </div>
      )}
    </section>
  );
}
