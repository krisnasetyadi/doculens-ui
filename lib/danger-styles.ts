// One red for everything that deletes or removes. The source of truth is the
// Delete button in the Sources toolbar: it is the `destructive` token (light
// #e7000b), so every delete is that same token, not a hex written by hand.
//
// Dark mode lifts the text to red-400. The dark `destructive` token is tuned to
// sit behind white text on a solid button, and is too dim to read as text on navy.

/** Icon-only trash button on a row: quiet grey until hovered, then red on a faint red wash. */
export const DANGER_ICON_BUTTON_CLASS =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-red-500/10 dark:hover:text-red-400";

/** The one red of the soft kind: the red of the PDF file icon (Tailwind red-600, red-400 in dark mode) is the source of truth. The destructive menu rows
 * ("Sign out", "Delete"), the "Storage full" status and the PDF icon all take it from here, so they cannot drift apart. `RED_WASH_CLASS` is the
 * tile behind the PDF icon. */
export const RED_TEXT_CLASS = "text-red-600 dark:text-red-400";
export const RED_WASH_CLASS = "bg-red-50 dark:bg-[#42222d]";

/** Colors of a destructive dropdown item: the shared red (a menu row is quiet at rest and only washes on hover/focus). Used by ActionMenuItem;
 * sizing stays with the menu. */
export const DANGER_MENU_COLOR_CLASS =
  `${RED_TEXT_CLASS} focus:bg-red-50 focus:text-red-600 focus-visible:ring-red-600/30 dark:focus:bg-red-500/10 dark:focus:text-red-400 dark:focus-visible:ring-red-400/30`;

/** The shared red as plain text or an icon with no wash behind it (4.8:1 on the card). Used by the "Storage full" status in the Files toolbar. */
export const DANGER_QUIET_TEXT_CLASS = RED_TEXT_CLASS;
