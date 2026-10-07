// One look for every "..." menu (chat list, folders, files, team members, skills):
// opens just under its button, left edge on the button's, never on top of it.
// Values come from chat-redesign.html; the chat list menu is the reference.
import { DANGER_MENU_COLOR_CLASS } from "@/lib/danger-styles";

/** Placement props for DropdownMenuContent. Radix flips it above the button when there's no room below. */
export const MENU_POSITION = {
  side: "bottom",
  align: "start",
  sideOffset: 8,
  collisionPadding: 8,
} as const;

// Spacing is matched to a macOS-native menu measured at the same type size:
// 28px rows, 2px above the first row and below the last, 7px from icon to
// label, and 9px of air around a separator so the groups still read apart.
export const MENU_CONTENT_CLASS =
  "w-max min-w-36 max-w-[calc(100vw-16px)] rounded-[10px] border-border bg-popover px-1 py-0.5 shadow-[0_8px_24px_rgba(24,32,51,0.11)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]";

export const MENU_ITEM_CLASS =
  "h-7 cursor-pointer gap-[7px] rounded-md px-2 py-0 font-['Inter'] text-[13px] leading-[1.3] font-normal text-[#0A0A0A] whitespace-nowrap focus:bg-accent focus:text-[#0A0A0A] dark:text-foreground dark:focus:text-accent-foreground";

/** Delete and Remove rows. The red is shared with every other delete, see lib/danger-styles. */
export const MENU_DANGER_CLASS = DANGER_MENU_COLOR_CLASS;

export const MENU_SEPARATOR_CLASS = "mx-0.5 my-1 bg-border";

/** The "..." button itself (the caller adds any hover-reveal behaviour). */
export const MENU_TRIGGER_CLASS =
  "grid size-6 shrink-0 place-items-center rounded-lg p-0 text-muted-foreground hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06]";
