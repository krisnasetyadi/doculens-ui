// One red for everything that deletes or removes. The source of truth is the
// Delete button in the Sources toolbar: it is the `destructive` token (light
// #e7000b), so every delete is that same token, not a hex written by hand.
//
// Icons need no class of their own: a trash icon drawn with currentColor takes
// the red of the text next to it, so the icon and the label can never drift.
//
// Dark mode lifts the text to red-400. The dark `destructive` token is tuned to
// sit behind white text on a solid button, and is too dim to read as text on navy.
// Solid backgrounds (a filled Delete button) keep the token in both themes.

/** Red text, and any currentColor icon beside it. */
export const DANGER_TEXT_CLASS = "text-destructive dark:text-red-400";

/** Secondary (outline) button that deletes: pair with the surface's own secondary button class. */
export const DANGER_OUTLINE_CLASS =
  "text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-400";

/** Icon-only trash button on a row: quiet grey until hovered, then red on a faint red wash. */
export const DANGER_ICON_BUTTON_CLASS =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-red-500/10 dark:hover:text-red-400";

/** Icon-only trash button that is red at rest (a bar where the delete is the point). */
export const DANGER_ICON_BUTTON_ACTIVE_CLASS =
  "text-destructive hover:bg-destructive/10 hover:text-destructive dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-400";

/** Filled destructive button (the confirm in a delete dialog, a small remove badge). */
export const DANGER_SOLID_CLASS = "bg-destructive text-destructive-foreground hover:bg-destructive/90";

/** Colors of a destructive dropdown item: a softer red than the button token (a menu row is quiet at
 * rest and only washes on hover/focus). Used by ActionMenuItem; sizing stays with the menu. */
export const DANGER_MENU_COLOR_CLASS =
  "text-[#BD5553] focus:bg-[#FFF3F1] focus:text-[#BD5553] focus-visible:ring-[#BD5553]/30 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-400 dark:focus-visible:ring-red-400/30";
