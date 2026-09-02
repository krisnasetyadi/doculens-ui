"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOC_MIN_CHATS } from "./chat-types";

interface ChatTocProps {
  totalUserTurns: number;
  /** Every question the panel can label, ascending by turn — see
   * useChatThread.questionIndex. May be missing turns it has no text for
   * yet (not fetched, not loaded). */
  questionIndex: Array<{ turn: number; preview: string }>;
  questionsLoading: boolean;
  loadingOlder: boolean;
  /** The chat the reader is currently on, 1-based — the rail marks its bar
   * at rest, so it already says where you are before anyone hovers. */
  activeTurn: number | null;
  /** First hover of the rail — the moment the full question index (beyond
   * what's already loaded in the thread) is worth fetching. */
  onOpen: () => void;
  onJumpTurn: (turnIndex: number) => void;
}

// The panel shows a fixed number of questions and scrolls for the rest, so
// its height is predictable instead of growing until it covers the thread
// it's meant to navigate. PANEL_ROW_HEIGHT has to match the row's height
// below (h-[41.6px]) for that math to hold.
const PANEL_ROW_HEIGHT = 41.6; // px — 32px base, scaled 1.3x
const PANEL_VISIBLE_ROWS = 9;

// Breathing room left above/below the active dash when the rail has to
// scroll to reveal it, so it never lands flush against a cut-off edge.
const RAIL_EDGE_PADDING = 8;

/** MS-237 poin 5: the navigation rail beside the thread, one dash per
 * question ever asked in this session. Hovering any dash opens a panel
 * listing every question (scrollable past PANEL_VISIBLE_ROWS) and highlights
 * the single row that dash points to — never more than one row at once, so
 * the rail and the list always agree on exactly one target. Clicking a dash
 * or a row jumps there, paging older messages in first if needed — see
 * useChatThread.revealTurn.
 *
 * There's no cap on the number of dashes: 20 chats is 20 dashes. What bounds
 * the rail is the height it's given, not a count — it scrolls once the
 * dashes outgrow that, keeping the active one in view, so how many are
 * visible follows the window/zoom instead of a number picked here that would
 * be wrong at some other size. */
export function ChatToc({
  totalUserTurns,
  questionIndex,
  questionsLoading,
  loadingOlder,
  activeTurn,
  onOpen,
  onJumpTurn,
}: ChatTocProps) {
  const [open, setOpen] = useState(false);
  // The one turn the panel highlights — whichever dash/row the pointer is
  // over, falling back to the reader's current position while just idly
  // open. Updated by hovering either the rail or a row in the panel.
  const [hoveredTurn, setHoveredTurn] = useState<number | null>(null);
  // Separate from `hoveredTurn`: only a *rail* hover should yank the list's
  // scroll position to bring a row into view — moving the pointer over rows
  // already sitting in the open panel must never do that, or the list would
  // shift under the cursor as it travels down. Only this drives the
  // scroll-into-view effect below.
  const [railHoverTurn, setRailHoverTurn] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLButtonElement>());
  const railRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef(new Map<number, HTMLButtonElement>());

  const highlightedTurn = hoveredTurn ?? activeTurn;

  // Open at the bottom: the reader is at the newest message, so the newest
  // questions are the ones they're navigating away from.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, questionIndex.length]);

  // Keep the current chat's dash on screen. The rail holds one dash per
  // chat and scrolls once they outgrow the height it's been given, so on a
  // long conversation the dash you're on can sit outside the visible slice —
  // nudge it back in, and only when it's actually out (never re-centering a
  // dash that's already visible, which would make the rail crawl on every
  // scroll tick). Done by hand rather than scrollIntoView, which would also
  // scroll the thread behind it.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const keepActiveVisible = () => {
      const bar = activeTurn !== null ? barRefs.current.get(activeTurn) : null;
      // clientHeight is 0 until the flex band the rail sits in has been laid
      // out. Measuring then produces a garbage offset (bottom - 0), which
      // lands the rail at some arbitrary scroll position it never leaves,
      // since nothing re-runs this until the active chat changes.
      if (!bar || rail.clientHeight === 0) return;
      const top = bar.offsetTop;
      const bottom = top + bar.offsetHeight;
      if (top < rail.scrollTop) {
        rail.scrollTop = top - RAIL_EDGE_PADDING;
      } else if (bottom > rail.scrollTop + rail.clientHeight) {
        rail.scrollTop = bottom - rail.clientHeight + RAIL_EDGE_PADDING;
      }
    };
    keepActiveVisible();
    // The rail's height is what decides how many dashes are visible, so a
    // resized window, a zoom change, or the composer growing all change how
    // much of the rail is on screen — and can leave the active dash outside
    // it. This is also the first run that sees a real height (see above).
    const observer = new ResizeObserver(keepActiveVisible);
    observer.observe(rail);
    // Belt and braces for the window-level cases (resize, browser zoom):
    // the observer covers them when the rail's own box changes, but this
    // fires even where that measurement lands identical, and costs nothing.
    window.addEventListener("resize", keepActiveVisible);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", keepActiveVisible);
    };
  }, [activeTurn, totalUserTurns]);

  // Bring the rail-hovered row into view — never fired by hovering inside
  // the panel itself (see railHoverTurn above), so once the panel is open
  // the list only ever moves from an actual scroll, not from the cursor
  // wandering across it.
  useEffect(() => {
    const list = listRef.current;
    const row = railHoverTurn !== null ? rowRefs.current.get(railHoverTurn) : null;
    if (!list || !row) return;
    list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2;
  }, [railHoverTurn]);

  if (totalUserTurns < TOC_MIN_CHATS) return null;

  const show = () => {
    setOpen(true);
    onOpen();
  };

  const hide = () => {
    setOpen(false);
    setHoveredTurn(null);
    setRailHoverTurn(null);
  };

  return (
    <div
      // `w-fit`, not a fixed width: the dashes are wider than any sensible
      // fixed box (and can grow further), and a fixed width here combined
      // with the rail's own overflow-y-auto below makes the browser also
      // clip horizontally per the CSS overflow spec (setting one axis to a
      // non-visible value forces the other to `auto` too) — every dash
      // beyond the fixed width was rendering at full size but invisible,
      // sliced down to that width. Shrinking to content means there's never
      // horizontal overflow to clip in the first place.
      className="group relative flex h-full w-fit flex-col"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
      }}
    >
      {/* The rail is its own scroll box, and the panel below is deliberately
          NOT inside it — an ancestor with overflow would clip the panel. */}
      <div
        ref={railRef}
        // `w-fit`, same reasoning as the wrapper above: it's what actually
        // avoids the horizontal clip (an explicit overflow-x-visible here
        // does NOT — the CSS spec forces overflow-x to auto right back
        // whenever overflow-y is non-visible, no matter how overflow-x
        // itself is set, so it's `w-fit` doing the real work).
        className="relative flex h-full w-fit flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* `m-auto`, not `justify-center`: both centre the dashes while they
            fit, but a centred flex container that overflows puts its first
            items above scrollTop 0 where they can never be scrolled back
            to. Auto margins collapse to 0 instead of going negative. */}
        <div className="m-auto flex flex-col items-end gap-[10.69px] py-1">
          {Array.from({ length: totalUserTurns }, (_, i) => i + 1).map((turn) => (
            <button
              key={turn}
              ref={(node) => {
                if (node) barRefs.current.set(turn, node);
                else barRefs.current.delete(turn);
              }}
              type="button"
              disabled={loadingOlder}
              onClick={() => onJumpTurn(turn)}
              onMouseEnter={() => {
                setHoveredTurn(turn);
                setRailHoverTurn(turn);
              }}
              aria-label={`Chat ${turn} of ${totalUserTurns}`}
              aria-current={turn === activeTurn ? "true" : undefined}
              className={cn(
                "h-[3px] w-[25px] shrink-0 rounded-full bg-foreground/25 transition-all",
                "group-hover:bg-foreground/40 hover:!bg-foreground",
                turn === highlightedTurn && "!bg-foreground",
                loadingOlder && "cursor-wait",
              )}
            />
          ))}
        </div>
      </div>

      {open && (
        // Sits flush against the rail (the padding is part of this element,
        // not a gap) so the pointer can travel from a dash into the list
        // without crossing dead space and closing the panel on the way.
        <div className="absolute right-full top-0 flex h-full items-center pr-2">
          <div className="w-[424px] overflow-hidden rounded-xl border border-border/60 bg-popover py-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <div
              // `relative` so a row's offsetTop is measured against this
              // list rather than whatever positioned ancestor is above it —
              // that's what the rail-hover scroll effect above assumes.
              // Moving the pointer within this list only ever highlights —
              // it never calls setRailHoverTurn, so it never re-triggers
              // that effect and the list never scrolls out from under it.
              ref={listRef}
              className="relative overflow-y-auto custom-scrollbar"
              style={{ maxHeight: PANEL_ROW_HEIGHT * PANEL_VISIBLE_ROWS }}
            >
              {questionsLoading && questionIndex.length === 0 ? (
                <div
                  className="flex items-center justify-center gap-2 px-3 text-muted-foreground"
                  style={{ height: PANEL_ROW_HEIGHT * 2 }}
                >
                  <Loader2 className="h-[20.8px] w-[20.8px] animate-spin text-primary" />
                  <span className="text-[18.2px] font-['Inter']">Memuat daftar chat…</span>
                </div>
              ) : (
                questionIndex.map(({ turn, preview }) => (
                  <button
                    key={turn}
                    ref={(node) => {
                      if (node) rowRefs.current.set(turn, node);
                      else rowRefs.current.delete(turn);
                    }}
                    type="button"
                    disabled={loadingOlder}
                    onClick={() => {
                      onJumpTurn(turn);
                      hide();
                    }}
                    onMouseEnter={() => setHoveredTurn(turn)}
                    aria-label={`Chat ${turn} of ${totalUserTurns}`}
                    className={cn(
                      "block h-[41.6px] w-full truncate px-[18.2px] text-left text-[18.2px] leading-[41.6px] font-['Inter'] text-foreground/85",
                      "hover:bg-accent hover:text-accent-foreground",
                      turn === highlightedTurn && "bg-accent/60",
                      loadingOlder && "cursor-wait",
                    )}
                  >
                    {preview || `Chat ${turn}`}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
