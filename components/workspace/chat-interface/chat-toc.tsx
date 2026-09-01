"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TOC_MIN_TURNS, type Message } from "./chat-types";

interface ChatTocProps {
  messages: Message[];
  totalUserTurns: number;
  loadingOlder: boolean;
  onJumpTurn: (turnIndex: number) => void;
}

const PREVIEW_LENGTH = 60;

/** MS-237 poin 6-9: a vertical navigation rail beside the thread, one marker
 * per question ever asked in this session — including ones not fetched yet
 * (turnIndex is 1-based from the start of the conversation; the parent
 * resolves an unloaded target by paging backward until it's covered, then
 * scrolls — see useChatThread.revealTurn). Modeled on ChatGPT's own
 * navigation rail: markers carry a primary tint so they read as
 * interactive rather than blending into the page, get clearer on hover,
 * and hovering one shows which question it jumps to. */
export function ChatToc({ messages, totalUserTurns, loadingOlder, onJumpTurn }: ChatTocProps) {
  if (totalUserTurns < TOC_MIN_TURNS) return null;

  const userMsgs = messages.filter((m) => m.role === "user");
  const firstLoadedTurn = totalUserTurns - userMsgs.length + 1;

  return (
    <div
      className="group flex h-full w-4 flex-col items-end justify-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Navigate messages"
    >
      {Array.from({ length: totalUserTurns }, (_, i) => i + 1).map((turnIndex) => {
        const isLoaded = turnIndex >= firstLoadedTurn;
        const loadedMessage = isLoaded ? userMsgs[turnIndex - firstLoadedTurn] : null;
        const preview = loadedMessage
          ? loadedMessage.content.length > PREVIEW_LENGTH
            ? `${loadedMessage.content.slice(0, PREVIEW_LENGTH)}…`
            : loadedMessage.content
          : `Question ${turnIndex}`;

        return (
          <Tooltip key={turnIndex}>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={loadingOlder}
                onClick={() => onJumpTurn(turnIndex)}
                aria-label={`Question ${turnIndex} of ${totalUserTurns}`}
                className={cn(
                  "h-1 w-3.5 shrink-0 rounded-full bg-primary/50 opacity-60 transition-all",
                  "group-hover:opacity-90 hover:!w-6 hover:!bg-primary hover:!opacity-100",
                  !isLoaded && "bg-muted-foreground/35 opacity-40",
                  loadingOlder && "cursor-wait",
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={10} className="whitespace-nowrap font-['Inter']">
              {preview}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
