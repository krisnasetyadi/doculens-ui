// Shared look for Settings (every tab, its dialogs and menus), taken from the
// DocuLens UI kit so the whole modal reads as one surface:
//   shell    neutral rail (#f7f8fa) | card-tone pane | bordered cards (14px), lines instead of fills
//   color    one action blue (primary, active nav, usage fill); #182033 headings and key values,
//            #56627a labels and descriptions; green, amber and red only for status
//   type     title 19 bold | section 13 bold | label 11 semibold muted | caption 11-12 muted
//   actions  36px buttons, 8px radius, 12px bold; primary blue, secondary paper + border
//   feedback 8px notices with a tinted wash; 6px badges
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { DANGER_OUTLINE_CLASS, DANGER_SOLID_CLASS } from "@/lib/danger-styles";

/** The modal itself: kit dialog radius, strongest elevation. */
export const SETTINGS_DIALOG_CLASS =
  `p-0 gap-0 flex max-w-[min(900px,calc(100%-2rem))] sm:max-w-[min(900px,calc(100%-2rem))] w-full h-[min(720px,85vh)] overflow-hidden rounded-[14px] border-border bg-card max-md:left-0 max-md:top-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0 max-md:sm:max-w-none shadow-[0_24px_70px_rgba(24,32,51,0.15)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)] [&>[data-slot=dialog-close]]:rounded-lg [&>[data-slot=dialog-close]]:border [&>[data-slot=dialog-close]]:border-border [&>[data-slot=dialog-close]]:bg-card [&>[data-slot=dialog-close]]:p-2 [&>[data-slot=dialog-close]]:text-muted-foreground [&>[data-slot=dialog-close]]:opacity-100 [&>[data-slot=dialog-close]:hover]:bg-accent/50 auto-hide-scrollbar`;

// Dialogs opened from Settings (reset password, edit member, remove) use the shared
// dialog look from lib/dialog-styles; nothing Settings-specific is needed here.

export const SETTINGS_TITLE_CLASS =
  "font-manrope text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-foreground";
export const SETTINGS_DESC_CLASS = "mt-0.5 font-inter text-[13px] leading-relaxed text-muted-foreground";
export const SECTION_TITLE_CLASS = "font-manrope text-[13px] font-bold tracking-tight text-foreground";
export const LABEL_CLASS = "font-inter text-[11px] font-semibold text-muted-foreground";
export const CAPTION_CLASS = "font-inter text-[11px] leading-4 text-muted-foreground";
export const FIGURE_CLASS = "font-manrope text-2xl font-bold tabular-nums tracking-[-0.04em] text-foreground";
export const FIGURE_UNIT_CLASS = "text-xs font-normal tracking-normal text-muted-foreground";

/** A card: the kit's "showcase" surface. */
export const CARD_CLASS = "rounded-[14px] border border-border bg-card p-5 shadow-xs";
/** A bordered list or table of rows. */
export const LIST_CLASS = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card";
export const ROW_CLASS = "transition-colors hover:bg-accent/40";

/** Inputs: 40px, 8px radius, 12px text, soft focus ring (kit `.control`). */
export const INPUT_CLASS =
  "h-10 rounded-lg border-border bg-card px-[11px] text-xs shadow-xs md:text-xs placeholder:text-muted-foreground/70 hover:border-foreground/20 focus-visible:border-primary/50 focus-visible:ring-primary/10";
/** The compact inline inputs inside allocation rows. */
export const INPUT_COMPACT_CLASS =
  "h-7! rounded-md border-border bg-card px-2 text-xs md:text-xs focus-visible:border-primary/50 focus-visible:ring-primary/10";

// Buttons: pass with the matching shadcn variant (primary = default, others = outline/ghost).
const BUTTON_BASE = "h-9 gap-2 rounded-lg px-[13px] font-manrope text-xs font-bold";
export const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE} shadow-[0_3px_8px_rgba(59,111,240,0.17)] hover:bg-primary-hover active:bg-primary-pressed`;
export const SECONDARY_BUTTON_CLASS = `${BUTTON_BASE} border-border bg-card text-foreground shadow-xs hover:bg-accent/50 hover:text-foreground`;
export const GHOST_BUTTON_CLASS = `${BUTTON_BASE} text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground`;
// The red is the shared delete red (lib/danger-styles), same as the Sources toolbar Delete.
export const DANGER_BUTTON_CLASS = `${BUTTON_BASE} ${DANGER_SOLID_CLASS}`;
export const DANGER_OUTLINE_BUTTON_CLASS = `${BUTTON_BASE} border-destructive/30 bg-card ${DANGER_OUTLINE_CLASS} hover:bg-destructive/10 dark:border-destructive/40 dark:hover:bg-red-500/10`;
/** Row-sized variant of any button above. */
export const BUTTON_SM_CLASS = "h-7 px-2.5";

/** Badges: 6px radius, 10px bold (kit `.badge`). */
const BADGE_BASE = "inline-flex shrink-0 items-center gap-1 rounded-md px-[7px] py-1 font-manrope text-[10px] font-bold uppercase leading-none tracking-[0.06em]";
export const BADGE_CLASSES = {
  blue: `${BADGE_BASE} bg-accent text-primary-hover dark:bg-primary/15 dark:text-primary`,
  neutral: `${BADGE_BASE} bg-[#eef1f6] text-muted-foreground dark:bg-muted`,
  amber: `${BADGE_BASE} bg-[#fff4df] text-[#946528] dark:bg-amber-500/10 dark:text-amber-400`,
  green: `${BADGE_BASE} bg-[#eaf5ef] text-[#39856a] dark:bg-emerald-500/10 dark:text-emerald-400`,
  red: `${BADGE_BASE} bg-[#fbecee] text-[#ad4c54] dark:bg-destructive/10 dark:text-red-400`,
} as const;

type Tone = "success" | "error" | "warning" | "info";
const NOTICE_TONES: Record<Tone, { className: string; Icon: ComponentType<{ className?: string }> }> = {
  success: { className: "bg-[#eaf5ef] text-[#3d795f] dark:bg-emerald-500/10 dark:text-emerald-400", Icon: CheckCircle2 },
  error: { className: "bg-[#fbecee] text-[#9f454c] dark:bg-destructive/10 dark:text-red-400", Icon: AlertCircle },
  warning: { className: "bg-[#fff4df] text-[#8c704d] dark:bg-amber-500/10 dark:text-amber-400", Icon: AlertCircle },
  info: { className: "bg-[#edf3ff] text-[#435f9e] dark:bg-primary/10 dark:text-primary", Icon: Info },
};

/** Inline feedback (kit `.alert`): tinted wash, icon, 12px text. */
export function Notice({ tone, children, className, ...props }: { tone: Tone } & ComponentProps<"p">) {
  const { className: toneClass, Icon } = NOTICE_TONES[tone];
  return (
    <p
      className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5 font-inter text-xs leading-relaxed", toneClass, className)}
      {...props}
    >
      <Icon className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** The page title that opens every Settings tab: big title, one line of help. */
export function SettingsHeader({
  icon: Icon,
  title,
  description,
  badge,
  aside,
}: {
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description: ReactNode;
  /** Small label next to the title (e.g. "Admin"). */
  badge?: ReactNode;
  /** Right-aligned extra (e.g. "3/5 used"). */
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* Icon chip: card tone with a light border; the blue glyph is the only color. */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card ring-1 ring-border">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className={cn(SETTINGS_TITLE_CLASS, "flex items-center gap-2")}>
            {title}
            {badge}
          </h2>
          <p className={SETTINGS_DESC_CLASS}>{description}</p>
        </div>
      </div>
      {/* The modal's close button floats over the pane's top-right corner
          (top-5 right-5, 34px wide: it spans 20-54px from the right edge) and
          the pane's own padding is only 40px, so an aside at the content edge
          sits underneath it. 22px more keeps it 8px clear of the button. */}
      {aside && <div className="mr-[22px] shrink-0 max-sm:mr-0 max-sm:self-start">{aside}</div>}
    </div>
  );
}

/** A titled block of a tab: a small bold heading, then its rows or cards. */
export function SettingsSection({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned extra on the heading line (a count, a badge). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={SECTION_TITLE_CLASS}>{title}</h3>
          {description && <p className={cn(CAPTION_CLASS, "mt-0.5")}>{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** One card holding a stack of setting rows, split by hairlines. */
export function SettingsGroup({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card shadow-xs", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** A single setting: what it is on the left (title + one line), its control on the right. */
export function SettingRow({
  title,
  description,
  children,
  className,
  inline = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Keep the control beside the text on phones too. Only for small controls
   * (a photo, a badge, a switch); anything wider stacks under the text below sm. */
  inline?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 px-5 py-4",
        !inline && "max-sm:flex-col max-sm:items-stretch max-sm:gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-manrope text-[13px] font-bold text-foreground">{title}</p>
        {description && <div className={cn(CAPTION_CLASS, "mt-0.5 text-xs")}>{description}</div>}
      </div>
      {children && <div className={cn("shrink-0", !inline && "max-sm:w-full max-sm:shrink")}>{children}</div>}
    </div>
  );
}
