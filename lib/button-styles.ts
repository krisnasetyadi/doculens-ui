// CTA button looks shared by empty states and the Sources page: primary matches the
// sidebar New Inquiry button, secondary sits beside it with the same radius and font.

/** The tab's main action (Add files, Add link, Connect ...). Same look as the
 * New Inquiry CTA in the sidebar, which is the source of truth for buttons. */
export const PRIMARY_BUTTON_CLASS =
  "h-10 flex-1 gap-1.5 rounded-xl px-4 font-manrope text-xs font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] transition-all hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] active:bg-primary-pressed sm:h-9 sm:flex-none sm:shrink-0";

/** Everything secondary next to it (New folder, Move, Sync ...): same radius and font. */
export const SECONDARY_BUTTON_CLASS =
  "h-10 gap-1.5 rounded-xl bg-card px-4 font-manrope text-xs font-bold sm:h-9";
