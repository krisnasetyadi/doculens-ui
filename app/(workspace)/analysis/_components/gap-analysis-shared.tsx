"use client";

// Shared by the Analysis pages (history and a run's result). Status labels live in ../_lib/runs.ts.

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Truncated text that reveals the full value in a tooltip on hover/focus —
 * used for table cells whose content (item titles, evidence, recommendations)
 * can be arbitrarily long free-text from the LLM. */
export function TruncatedCell({
  text,
  lines = 1,
  maxWidth,
}: {
  text: string;
  lines?: 1 | 2 | 3;
  /** Bind to the column's live (resized) width so shrinking the column
   * actually shrinks what's rendered, instead of the column being unable
   * to go below whatever width the unclamped content demands. */
  maxWidth?: number;
}) {
  const clampClass = lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "line-clamp-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`block ${clampClass} cursor-default`}
          style={maxWidth !== undefined ? { maxWidth } : undefined}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap break-words text-left">{text}</TooltipContent>
    </Tooltip>
  );
}
