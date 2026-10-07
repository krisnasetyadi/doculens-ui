import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Tones mirror what each real element is painted with, so the placeholder
// reads as the same row dimmed rather than a generic grey/blue bar:
// icon tile = bg-primary/10, reply chip = bg-muted, group label = text-primary.
// Text bars use a muted-foreground tint because the default bg-accent is
// barely distinguishable from bg-card.
const TILE = "bg-primary/10";
const LABEL = "bg-primary/20";
const TEXT = "bg-muted-foreground/15";
const CHIP = "bg-muted";

// "page" mirrors a History page row, "dialog" mirrors a chat-search-dialog row.
// The two differ in row padding, divider, and where the chevron sits, and the
// skeleton has to match its own host or the list jumps when data lands.
export function ConversationListSkeleton({
  rows = 4,
  label = "Loading conversations…",
  variant = "page",
}: {
  rows?: number;
  label?: string;
  variant?: "page" | "dialog";
}) {
  const isPage = variant === "page";

  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {/* Real label: 11px text, leading-normal (16.5px), mb-2. */}
        <div className={cn("mb-2 flex h-[16.5px] items-center", isPage ? "px-1" : "px-2")}>
          <Skeleton className={cn("h-2.5 w-16", LABEL)} />
        </div>
        <div className={isPage ? "divide-y divide-border/60" : "space-y-0.5"}>
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 px-2",
                isPage ? "items-start py-3" : "items-center py-2.5",
              )}
            >
              <Skeleton className={cn("h-9 w-9 shrink-0 rounded-xl", TILE, isPage && "mt-0.5")} />
              <div className="min-w-0 flex-1">
                {/* Real title: text-sm (20px line). The page row also has mb-1. */}
                <div className={cn("flex h-5 items-center", isPage && "mb-1")}>
                  <Skeleton className={cn("h-3.5", TEXT, index % 2 === 0 ? "w-2/3" : "w-1/2")} />
                </div>
                {/* Real meta row: 10px chip with py-0.5 is 19px tall. */}
                <div className={cn("mt-1 flex h-[19px] items-center", isPage ? "gap-3" : "gap-2")}>
                  <Skeleton className={cn("h-2.5 w-14", TEXT)} />
                  <Skeleton className={cn("h-[19px] w-16 rounded-full", CHIP)} />
                </div>
              </div>
              {isPage ? (
                // Real trailing group is top-aligned: a 26px delete button
                // (hidden until hover on desktop, but it still takes space)
                // then the chevron.
                <div className="flex shrink-0 items-center gap-1">
                  <div className="h-[26px] w-[26px]" />
                  <Skeleton className={cn("h-4 w-4 rounded-sm", TEXT)} />
                </div>
              ) : (
                <Skeleton className={cn("h-4 w-4 shrink-0 rounded-sm", TEXT)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
