// Shared look for the Sources page, so every tab reads the same.
//
// The scale is anchored to the workspace sidebar at 100%, so the two read as
// one app (and shrink together, since everything here is rem/px utilities):
//   sidebar: brand 16 / nav 14 bold / section label 11 bold tracked / recent 12
//   sources: page title 28 / tab 13 / row title 13 / button 12 / meta 11 / label 11
// Layout: heading block, underline tabs, one panel, flat list with dividers.

import { panelVariants } from "@/components/panel";
import { cn } from "@/lib/utils";

/** The page column: wide enough to sit comfortably next to the sidebar. */
// Padding is the reference mockup's, value for value: sides clamp(24px, 5vw, 72px),
// 24px at 900px and below, 16px at 620px and below; 40px above and 56px below
// (30px and 27px on narrow screens); the column caps at 1110px.
export const PAGE_CLASS =
  "mx-auto max-w-[1110px] px-[clamp(24px,5vw,72px)] pb-14 pt-10 max-[900px]:px-6 max-[900px]:py-[30px] max-[620px]:px-4 max-[620px]:py-[27px]";

/** The single container around a tab's content (also the OS file drop zone). */
export const TAB_PANEL_CLASS = cn(
  panelVariants(),
  "px-[22px] py-5 transition-colors max-[620px]:px-[13px] max-[620px]:py-[15px]",
);

/** Crumbs or title on the left, sort and the tab's actions on the right. */
export const TOOLBAR_CLASS = "mb-4 flex flex-wrap items-center gap-x-3 gap-y-2";


/** The label row above a list ("FILE") with its underline. Quiet on purpose. */
export const LIST_HEAD_CLASS =
  "border-b px-[11px] pb-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70 max-[620px]:hidden";

/** A list row: one source, one connection. Flat, separated by a divider. */
export const ROW_CLASS =
  "group relative flex items-center gap-3 border-b px-[11px] py-3 transition-colors last:border-b-0 hover:bg-accent/60 max-[620px]:gap-2 max-[620px]:px-[5px]";

export const ROW_TITLE_CLASS = "truncate font-manrope text-[13px] font-bold leading-5 text-foreground";

export const ROW_META_CLASS = "text-[11px] leading-4 text-muted-foreground";

/** The clickable header of an expandable connection (link, database, Telegram). Same hover as ROW_CLASS. */
export const CONNECTION_HEAD_CLASS =
  "group flex cursor-pointer items-center gap-3 px-[11px] py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 max-[620px]:gap-2 max-[620px]:px-[5px]";

/** A folder: a small card above the list. */
export const FOLDER_CARD_CLASS = cn(
  panelVariants(),
  "group relative flex items-center gap-2.5 px-3 py-[11px] transition-colors hover:border-primary/40 hover:bg-accent/60",
);

/** The expanded area under a connection row. */
export const ROW_PANEL_CLASS = "space-y-2 border-t bg-muted/30 p-3";

/** Shown only on hover on desktop (always on phones): drag handle, folder menu. */
export const ROW_REVEAL_CLASS =
  "transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100";
