// One look for every dialog (create folder, add link, connect, move, delete,
// sign out, settings sub-dialogs). The shell, title, description and footer live
// in the base `ui/dialog` and `ui/alert-dialog`; these are the parts a dialog
// composes inside it: fields and buttons.
//
//   shell   2xl radius, paper surface, soft border, 24px padding
//   title   Manrope 19 extrabold | description Inter 13 muted
//   field   46px tall, 12px radius, 16px inset, 15px text, a faint blue wash on paper
//   button  38px tall, 12px radius, Manrope 13 bold; primary keeps the blue glow

export const DIALOG_TITLE_CLASS = "font-manrope text-[19px] font-extrabold leading-tight tracking-tight";
export const DIALOG_DESCRIPTION_CLASS = "font-inter text-[13px] leading-relaxed text-muted-foreground";

/** Input ships `text-base md:text-sm`, which beats a plain size, so the md: size is set too. */
export const DIALOG_INPUT_CLASS =
  "h-[46px] rounded-xl border-border bg-[#f9fbff] px-4 text-[15px] shadow-xs md:text-[15px] dark:bg-input/30";
export const DIALOG_LABEL_CLASS = "text-xs font-semibold text-foreground";
export const DIALOG_HINT_CLASS = "text-[11px] leading-4 text-muted-foreground";

const BUTTON_BASE = "h-[38px] gap-2 rounded-xl px-4 font-manrope text-[13px] font-bold";
/** Cancel / secondary: pair with variant="outline". */
export const DIALOG_BUTTON_CLASS = `${BUTTON_BASE} border-border bg-card text-foreground shadow-xs hover:bg-accent/50 hover:text-foreground`;
/** The one action the dialog is for. */
export const DIALOG_PRIMARY_CLASS = `${BUTTON_BASE} shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:bg-primary-hover hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] active:bg-primary-pressed`;
/** Destructive confirm: no blue glow. */
export const DIALOG_DESTRUCTIVE_CLASS = `${BUTTON_BASE} bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90`;
