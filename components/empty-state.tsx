import type { ComponentProps, ElementType, ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/**
 * The one empty state in the app. A screen never builds its own: it picks a size by where it sits.
 *
 * - `full`: a whole page or tab with nothing in it.
 * - `compact`: a section inside a page, a dialog or a settings panel. The same look as `full`, smaller.
 * - `inline`: a narrow or nested list (sidebar, dropdown). One line of muted text, nothing else.
 *
 * Full and compact share one layout: icon in a soft well, a heading, one sentence, and the action as an
 * outline button. The heading names the thing that is missing ("No files yet"), never a generic "No data".
 * Leave `action` out for a user who is not allowed to do it: the heading and sentence stay, the button goes.
 * A search that matches nothing is not an empty list, use `NoResults`. A failed or loading list is not
 * empty either.
 */

/** A lucide icon, or any component that takes a `className` (the shared `Spinner`). */
type EmptyStateIcon = ElementType<{ className?: string }>;

export interface EmptyStateAction {
  label: string;
  /** Runs on click. Ignored when `href` is set. */
  onClick?: () => void;
  /** Renders the action as a link to another page instead of a button. */
  href?: string;
  icon?: EmptyStateIcon;
}

interface BlockEmptyStateBase {
  icon: EmptyStateIcon;
  heading: string;
  /** One sentence saying what the user can do next. */
  description: string;
  action?: EmptyStateAction;
  /** "outline" (default) for panels where this isn't the page's one CTA; "primary" for a standalone empty
   * page (History, a not-found page) where it is. */
  ctaVariant?: "outline" | "primary";
  className?: string;
}

interface FullEmptyStateProps extends BlockEmptyStateBase {
  size?: "full";
  /** Rendered next to the action, for a second button the action cannot describe (New Folder, Back). */
  secondaryAction?: ReactNode;
}

interface CompactEmptyStateProps extends BlockEmptyStateBase {
  size: "compact";
}

interface InlineEmptyStateProps {
  size: "inline";
  /** The one line of text. */
  heading: string;
  className?: string;
}

export type EmptyStateProps = FullEmptyStateProps | CompactEmptyStateProps | InlineEmptyStateProps;

// What differs between the two block sizes. Everything else (layout, colours, fonts, the button) is shared.
const BLOCK_SIZE = {
  full: {
    root: "min-h-[22rem] p-8",
    media: "mb-3 size-16 [&_svg:not([class*='size-'])]:size-6",
    title: "text-lg",
    description: "text-[13px]",
  },
  compact: {
    // md:p-6 as well, because the shadcn Empty root sets md:p-12 and a bare p-6 would lose to it on desktop.
    root: "p-6 md:p-6",
    media: "mb-2 size-10 [&_svg:not([class*='size-'])]:size-5",
    title: "text-sm",
    description: "text-xs",
  },
} as const;

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: ComponentProps<typeof Button>["variant"];
}) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon && <Icon className="size-3.5" />}
      {action.label}
    </>
  );
  if (action.href) {
    return (
      <Button asChild variant={variant}>
        <Link href={action.href}>{content}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {content}
    </Button>
  );
}

export function EmptyState(props: EmptyStateProps) {
  if (props.size === "inline") {
    return <p className={cn("px-2.5 py-2 text-[13px] text-muted-foreground", props.className)}>{props.heading}</p>;
  }

  const { icon: Icon, heading, description, action, ctaVariant = "outline", className } = props;
  const size = BLOCK_SIZE[props.size ?? "full"];
  const secondaryAction = props.size === "compact" ? undefined : props.secondaryAction;

  return (
    <Empty className={cn(size.root, className)}>
      <EmptyHeader className="max-w-sm gap-1.5">
        <EmptyMedia variant="icon" className={cn("border bg-muted/50 text-muted-foreground", size.media)}>
          <Icon />
        </EmptyMedia>
        {/* Not font-manrope like the rest of the app: EmptyTitle merges this through
            tailwind-merge, which reads that form as a font weight and drops it when
            font-extrabold is also present, leaving the title in Inter. */}
        <EmptyTitle className={cn("font-manrope font-extrabold tracking-tight [overflow-wrap:anywhere]", size.title)}>{heading}</EmptyTitle>
        <EmptyDescription className={cn("leading-relaxed", size.description)}>{description}</EmptyDescription>
      </EmptyHeader>
      {(action || secondaryAction) && (
        <EmptyContent className="flex-row justify-center gap-2">
          {action && <ActionButton action={action} variant={ctaVariant === "primary" ? "default" : "outline"} />}
          {secondaryAction}
        </EmptyContent>
      )}
    </Empty>
  );
}

/**
 * A search or filter that matched nothing. The same words and the same "Clear search" action on every
 * screen, and never the "nothing here yet" wording, because the list is not empty.
 */
export function NoResults({
  query,
  onClear,
  size = "compact",
  className,
}: {
  /** What the user typed. Left out for a filter that has no text. */
  query?: string;
  /** Clears the search. Left out when there is nothing the user can clear. */
  onClear?: () => void;
  size?: "compact" | "inline";
  className?: string;
}) {
  const heading = query?.trim() ? `No results for “${query.trim()}”` : "No results";
  if (size === "inline") return <EmptyState size="inline" heading={heading} className={className} />;
  return (
    <EmptyState
      size="compact"
      icon={Search}
      heading={heading}
      description="Try a different word or check the spelling."
      action={onClear ? { label: "Clear search", onClick: onClear } : undefined}
      className={className}
    />
  );
}
