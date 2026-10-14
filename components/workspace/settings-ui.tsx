// Shared look for Settings (every tab, its dialogs and menus), taken from the
// DocuLens UI kit so the whole modal reads as one surface:
//   shell    neutral rail (#f7f8fa) | card-tone pane | bordered cards (12px), lines instead of fills
//   color    one action blue (primary, active nav, usage fill); #182033 headings and key values,
//            #56627a labels and descriptions; green, amber and red only for status
//   type     title 19 bold | section 13 bold | label 11 semibold muted | caption 11-12 muted
//   actions  the shared Button (variant + size); nothing here restyles it
//   feedback the shared Notice and Badge (components/notice, ui/badge)
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { panelVariants } from "@/components/panel";

/** The modal itself: the shared dialog corner and shadow, sized for Settings. */
export const SETTINGS_DIALOG_CLASS =
  `p-0 gap-0 flex max-w-[min(900px,calc(100%-2rem))] sm:max-w-[min(900px,calc(100%-2rem))] w-full h-[min(720px,85vh)] overflow-hidden border-border bg-card max-md:left-0 max-md:top-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0 max-md:sm:max-w-none auto-hide-scrollbar`;

// Dialogs opened from Settings (reset password, edit member, remove) use the shared
// ui/dialog and ui/alert-dialog; nothing Settings-specific is needed here.

export const SETTINGS_TITLE_CLASS =
  "font-manrope text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-foreground";
export const SETTINGS_DESC_CLASS = "mt-0.5 font-inter text-[13px] leading-relaxed text-muted-foreground";
export const SECTION_TITLE_CLASS = "font-manrope text-[13px] font-bold tracking-tight text-foreground";
export const LABEL_CLASS = "font-inter text-[11px] font-semibold text-muted-foreground";
export const CAPTION_CLASS = "font-inter text-[11px] leading-4 text-muted-foreground";
export const FIGURE_CLASS = "font-manrope text-2xl font-bold tabular-nums tracking-[-0.04em] text-foreground";
export const FIGURE_UNIT_CLASS = "text-xs font-normal tracking-normal text-muted-foreground";

/** A card: the kit's "showcase" surface. */
export const CARD_CLASS = panelVariants({ padding: "lg" });
/** A bordered list or table of rows. */
export const LIST_CLASS = cn(panelVariants(), "divide-y divide-border overflow-hidden");
export const ROW_CLASS = "transition-colors hover:bg-accent/40";

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
      className={cn(LIST_CLASS, className)}
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
