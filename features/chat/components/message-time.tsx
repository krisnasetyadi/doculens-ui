"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatDayAge } from "@/lib/date";
import { cn } from "@/lib/utils";

/** When a chat message was sent: its time today ("10:52"), a short age before that ("Yesterday").
 * Hovering, or a screen reader, gets the full date and time (MS-909). */
export function MessageTime({ value, className }: { value: string; className?: string }) {
  const full = formatDateTime(value);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* `relative` keeps the sr-only text inside the thread's scroller. Without it that absolutely
            positioned span hangs off the chat frame below, which then scrolls and lifts the composer. */}
        <time
          dateTime={value}
          className={cn("relative cursor-default whitespace-nowrap font-inter text-[11px] leading-4 text-muted-foreground", className)}
        >
          <span aria-hidden="true">{formatDayAge(value)}</span>
          <span className="sr-only">{full}</span>
        </time>
      </TooltipTrigger>
      <TooltipContent>{full}</TooltipContent>
    </Tooltip>
  );
}
