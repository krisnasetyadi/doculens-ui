// One look for every "..." menu (chat list, folders, files, team members, skills):
// opens just under its button, left edge on the button's, never on top of it.
// The chat list menu is the reference.
import { DANGER_MENU_COLOR_CLASS } from "@/lib/danger-styles";

/** Placement props for DropdownMenuContent. Radix flips it above the button when there's no room below. */
export const MENU_POSITION = {
  side: "bottom",
  align: "start",
  sideOffset: 8,
  collisionPadding: 8,
} as const;

// The look: a solid card that sizes to its labels (200 to 230px), 37px rows (40px on a phone, a
// touch target), 13px medium text, 15px icons and one 10px gap. Light uses fixed hexes; dark keeps the
// theme tokens. Radix focuses the highlighted row, so `focus:` is the hover and keyboard highlight,
// and `focus-visible:` adds an inset ring only for keyboard use. Screens do not read these
// directly: they use components/action-menu.
export const MENU_CONTENT_CLASS =
  "w-max min-w-[200px] max-w-[min(230px,calc(100vw-16px))] rounded-xl border-[#DFE5EF] bg-[#FCFDFF] p-1 shadow-[0_8px_22px_rgba(25,38,60,0.10),0_2px_5px_rgba(25,38,60,0.05)] dark:border-border dark:bg-popover dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]";

/** Row metrics shared by plain, checkbox and danger rows. */
const MENU_ROW_CLASS =
  "h-[37px] max-sm:h-10 cursor-pointer gap-2.5 rounded-lg px-2.5 py-0 font-inter text-[13px] leading-none font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-inset";

export const MENU_ITEM_CLASS = `${MENU_ROW_CLASS} text-[#20283B] focus:bg-[#F2F5FB] focus:text-[#20283B] focus-visible:ring-primary/30 dark:text-foreground dark:focus:bg-accent dark:focus:text-accent-foreground`;

/** A checkbox row: the same metrics, with room on the left for the check. */
export const MENU_CHECKBOX_ITEM_CLASS = `${MENU_ITEM_CLASS} pl-8 pr-2.5`;

/** Delete and Remove rows. A soft red, see lib/danger-styles. */
export const MENU_DANGER_CLASS = DANGER_MENU_COLOR_CLASS;

/** The one divider, placed before a destructive action. */
export const MENU_SEPARATOR_CLASS = "mx-1 my-1 bg-[#DFE5EF] dark:bg-border";

/** A heading row inside a menu ("Sort by", "Toggle Columns"). */
export const MENU_LABEL_CLASS =
  "px-2.5 py-1.5 font-manrope text-[10px] font-bold uppercase tracking-[0.08em] text-[#63718A] dark:text-muted-foreground";

/** The "..." button itself (the caller adds any hover-reveal behaviour). */
// Under sm the button is a 40px touch target; the negative margin keeps the
// 24px footprint it has in the layout, so rows do not get taller.
export const MENU_TRIGGER_CLASS =
  "grid size-6 shrink-0 place-items-center rounded-lg p-0 text-muted-foreground hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06] max-sm:-m-2 max-sm:size-10";
