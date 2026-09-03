"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { GapAnalysisDialog } from "@/components/gap-analysis-dialog";
import { UsageDialog } from "@/components/usage-dialog";
import { useChatThread } from "@/hooks/use-chat-thread";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatMessage } from "./chat-message";
import { ChatComposer } from "./chat-composer";

// The composer's top edge is a transparent-to-opaque gradient (its `pt-12`).
// Text resting in that band is still legible, so the thread doesn't reserve
// the whole band — trimming it keeps the resting gap from looking empty.
const COMPOSER_FADE_ALLOWANCE = 40;

interface ChatInterfaceProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  selectedPublicLinkIds?: string[];
  selectedDbConnectionIds?: string[];
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
  initialSessionId?: string; // load an existing session from backend
}

export function ChatInterface(props: ChatInterfaceProps) {
  const thread = useChatThread(props);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The composer floats over the thread, so the thread reserves room for it.
  // Its height isn't fixed — the toolbar chips wrap on narrow widths, zoom, or
  // larger font sizes — so measure it instead of hardcoding the gap, otherwise
  // the last lines end up stuck behind it.
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages, thread.loading]);

  // Re-runs on sessionLoading because the composer isn't mounted during the
  // restore state, so there'd be nothing to observe on the first pass.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setComposerHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [thread.sessionLoading]);

  // Session restore loading state
  if (thread.sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-['Inter']">Restoring conversation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Center scroll area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div
            className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 w-full flex flex-col space-y-8 pb-48"
            style={{
              paddingBottom: composerHeight
                ? composerHeight - COMPOSER_FADE_ALLOWANCE
                : undefined,
            }}
          >
            {!thread.hasConversation ? (
              <ChatEmptyState onAskSuggested={thread.askSuggested} />
            ) : (
              thread.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isRegenerating={thread.regeneratingId === message.id}
                  onCopy={thread.copyMessage}
                  onRegenerate={thread.regenerateMessage}
                  onOpenPdfViewer={thread.openPdfViewer}
                />
              ))
            )}

            {thread.loading && (
              <div className="flex items-start space-x-4">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-primary/15">
                    <span className="material-symbols-outlined text-primary text-sm">hub</span>
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card rounded-2xl px-5 py-3.5 border border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-['Inter'] text-muted-foreground">Synthesizing intelligence…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <ChatComposer
          ref={composerRef}
          sources={thread.sources}
          input={thread.input}
          onInputChange={thread.setInput}
          onSubmit={thread.handleSubmit}
          loading={thread.loading}
          filteredCommands={thread.filteredCommands}
          onRunSlashCommand={thread.runSlashCommand}
          selectedProvider={thread.selectedProvider}
          selectedModel={thread.selectedModel}
          onModelChange={thread.onModelChange}
          availableModels={thread.availableModels}
          onGapCheckClick={() => thread.setGapAnalysisOpen(true)}
          rateLimit={thread.rateLimit}
          isMemberCapped={thread.isMemberCapped}
          requestMoreTokens={thread.requestMoreTokens}
          requestingMoreTokens={thread.requestingMoreTokens}
          tokenRequestSent={thread.tokenRequestSent}
        />
      </div>

      <PdfViewerDialog
        open={thread.pdfViewer.open}
        onOpenChange={(open) => thread.setPdfViewer((prev) => ({ ...prev, open }))}
        pdfUrl={thread.pdfViewer.pdfUrl}
        fileName={thread.pdfViewer.fileName}
        initialPage={thread.pdfViewer.page}
        searchText={thread.pdfViewer.searchText}
        contentPreview={thread.pdfViewer.contentPreview}
      />

      <GapAnalysisDialog open={thread.gapAnalysisOpen} onOpenChange={thread.setGapAnalysisOpen} />
      <UsageDialog
        open={thread.usageOpen}
        onOpenChange={thread.setUsageOpen}
        rateLimit={thread.rateLimit}
        onRequestMoreTokens={thread.requestMoreTokens}
        requestingMoreTokens={thread.requestingMoreTokens}
        tokenRequestSent={thread.tokenRequestSent}
      />
    </div>
  );
}
