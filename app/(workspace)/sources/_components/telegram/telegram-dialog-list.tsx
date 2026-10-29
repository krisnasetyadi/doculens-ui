import { useEffect, useRef, useState } from "react";
import type { TelegramDialog, TelegramHistoryRange } from "@/services";
import { TelegramDialogRow } from "./telegram-dialog-row";

// An account can have thousands of chats, and mounting a row costs about a millisecond, so the list
// starts with a screenful and adds more as the user scrolls toward the end. Search is what finds
// a chat far down.
const PAGE_SIZE = 60;

/** The scrolling list of chats in the picker. */
export function TelegramDialogList({
  dialogs,
  selectedIds,
  rangeFor,
  onToggle,
  onRangeChange,
}: {
  dialogs: TelegramDialog[];
  selectedIds: Set<string>;
  rangeFor: (dialogId: string) => TelegramHistoryRange;
  onToggle: (dialogId: string) => void;
  onRangeChange: (dialogId: string, range: TelegramHistoryRange) => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  // A different list (a new search) starts from the top again. Adjusted while rendering, not in an effect,
  // so the old length is never shown for a frame.
  const [shownDialogs, setShownDialogs] = useState(dialogs);
  if (shownDialogs !== dialogs) {
    setShownDialogs(dialogs);
    setLimit(PAGE_SIZE);
  }

  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const hasMore = limit < dialogs.length;

  // The new list starts at its first chat, not wherever the old one was scrolled to.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [dialogs]);

  useEffect(() => {
    const end = endRef.current;
    if (!hasMore || !end) return;
    // Watching the end again after each page also loads the next one at once if the list is still short.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLimit((current) => current + PAGE_SIZE);
      },
      { root: listRef.current, rootMargin: "200px" },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [hasMore, limit]);

  return (
    // relative: inside a <form>, every Radix checkbox adds a hidden absolute <input>.
    // Without a positioned list they are placed against the dialog instead, so a long
    // chat list made the whole dialog scroll on into empty space.
    <div ref={listRef} className="relative max-h-72 overflow-y-auto space-y-1.5 pr-1">
      {dialogs.slice(0, limit).map((dialog) => (
        <TelegramDialogRow
          key={dialog.dialog_id}
          dialog={dialog}
          selected={selectedIds.has(dialog.dialog_id)}
          range={rangeFor(dialog.dialog_id)}
          onToggle={onToggle}
          onRangeChange={onRangeChange}
        />
      ))}
      {hasMore && <div ref={endRef} aria-hidden="true" className="h-px" />}
    </div>
  );
}
