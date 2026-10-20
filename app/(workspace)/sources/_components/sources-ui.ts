// Shared look for the Sources page, so every tab reads the same.
//
// The scale is anchored to the workspace sidebar at 100%, so the two read as
// one app (and shrink together, since everything here is rem/px utilities):
//   sidebar: brand 16 / nav 14 bold / section label 11 bold tracked / recent 12
//   sources: page title 24 / tab 14 / row title 13 / button 12 / meta 11 / label 11
// Layout: heading block, segmented tabs, one panel, flat list, no dividers.

import { panelVariants } from "@/components/panel";
import { cn } from "@/lib/utils";

/** The page column: wide enough to sit comfortably next to the sidebar. */
// Padding is the reference mockup's, value for value: sides clamp(24px, 5vw, 72px),
// 24px at 900px and below, 16px at 620px and below; 40px above and 56px below
// (30px and 27px on narrow screens). The column caps at 880px, so a row's name and its
// switch stay close together on a wide screen instead of leaving a gap between them.
export const PAGE_CLASS =
  "mx-auto max-w-[880px] px-[clamp(24px,5vw,72px)] pb-14 pt-10 max-[900px]:px-6 max-[900px]:py-[30px] max-[620px]:px-4 max-[620px]:py-[27px]";

/** The single container around a tab's content (also the OS file drop zone). */
export const TAB_PANEL_CLASS = cn(
  panelVariants(),
  "rounded-[14px] px-6 pb-6 pt-[22px] transition-colors max-[620px]:px-[14px] max-[620px]:py-4",
);

/** Sort and the tab's actions on the right; the left stays empty unless there is somewhere to say where you are (the Files tab inside a folder). Inset like a row, so the title
 * starts where a row's icon tile does and the actions end where a row's controls do. */
export const TOOLBAR_CLASS = "mb-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 px-[11px] max-[620px]:px-[5px]";

/** The heading text of a Sources panel: the title over the toolbar ("All files", "All links") and the breadcrumb,
 * Manrope 15 / 700 in the ink colour, the sidebar nav size. */
export const HEADING_TEXT_CLASS = "font-manrope text-[15px] font-bold leading-6 text-foreground";

/** The title on the left of a connection tab's toolbar ("All links"), set like the Files tab's "All files" crumb (Manrope 15 / 700, the sidebar nav size). */
export const TOOLBAR_TITLE_CLASS = `-ml-1.5 mr-auto min-w-0 truncate px-1.5 py-1 ${HEADING_TEXT_CLASS}`;

/** A file row: one source, flat, with a hover wash and no line around it; space separates the rows. */
export const ROW_CLASS =
  "group relative flex min-h-[58px] items-center gap-3 rounded-lg px-[11px] py-2 transition-colors hover:bg-accent/60 max-[620px]:gap-2 max-[620px]:px-[5px]";

export const ROW_TITLE_CLASS = "truncate font-manrope text-[13.5px] font-semibold leading-5 text-foreground";

export const ROW_META_CLASS = "text-[11.5px] leading-4 text-muted-foreground";

/** The clickable header of an expandable connection (link, database, Telegram). Same hover as ROW_CLASS. */
export const CONNECTION_HEAD_CLASS =
  "group flex cursor-pointer items-center gap-3 rounded-lg px-[11px] py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 max-[620px]:gap-2 max-[620px]:px-[5px]";

/** A folder in the card view (the default): a small card above the list, icon tile then name and count. */
export const FOLDER_CARD_CLASS = cn(
  panelVariants(),
  "group relative flex h-[60px] items-center gap-3 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-accent/60",
);

/** The card view's grid. Inset by the row padding, so a card's edge sits where a file's type tile does;
 * three to a row, dropping to as many columns as fit at a readable width on a phone. */
export const FOLDER_GRID_CLASS =
  "grid grid-cols-3 gap-2 px-[11px] pt-2 max-[620px]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-[620px]:px-[5px]";

/** A folder in the list view: a slim row, flat like a file row but without the type tile. */
export const FOLDER_ROW_CLASS =
  "group relative flex items-center gap-3 rounded-lg px-[11px] py-1 transition-colors hover:bg-accent/60 max-[620px]:gap-2 max-[620px]:px-[5px]";

/** A section bar as tall as its 28px controls and with no padding of its own, so the
 * spacing is set where sections meet: toolbar to label 20px, label to the box under it 12px under Folders and
 * 6px under Files (the rows are flat, their own 12px of padding makes up the rest), the last folder to the Files label 16px (counting from the label's own line, which sits 4px inside the
 * bar; the toolbar's mb-4 supplies the 16px above Folders, so no margin of ours may sit next to it, margins would
 * collapse into one). */
export const SECTION_HEAD_CLASS = "flex min-h-7 items-center gap-2 px-[11px] max-[620px]:px-[5px]";

/** The section label itself ("Folders"): only says what is under it, so it is the same size as the names it heads
 * (13 / 600) but muted, and sits below the panel heading. It carries no count. */
export const SECTION_LABEL_CLASS = "font-manrope text-[13px] font-semibold leading-5 text-muted-foreground";

/** The expanded area under a connection row. */
export const ROW_PANEL_CLASS = "space-y-2 bg-muted/30 p-3";

/** Shown only on hover on desktop (always on phones), for secondary row controls such as a database's Refresh.
 * Not for a "..." menu: that stays visible, so it is plain the row has actions. */
export const ROW_REVEAL_CLASS =
  "transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100";
