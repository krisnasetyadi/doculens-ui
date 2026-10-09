import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SKELETON_TONE } from "@/lib/skeleton-tones";

// Tones mirror what each real element is painted with (see SKELETON_TONE): icon tile, reply chip,
// PDF badge (a tile tone), group label and text bars.
const { tile: TILE, label: LABEL, text: TEXT, chip: CHIP } = SKELETON_TONE;

// The real rows differ: titles of different lengths, a time of different width, and a PDF badge on
// only some of them. A skeleton of identical rows reads as a pattern, so these cycle across rows
// (counted over the whole list, not per group) and a PDF badge shows on some and not others.
const ROW_SHAPES = [
  { title: "w-3/5", time: "w-14", reply: "w-16", pdf: true },
  { title: "w-2/5", time: "w-12", reply: "w-14", pdf: false },
  { title: "w-[72%]", time: "w-16", reply: "w-[68px]", pdf: false },
  { title: "w-1/2", time: "w-12", reply: "w-16", pdf: true },
  { title: "w-[34%]", time: "w-14", reply: "w-14", pdf: false },
] as const;

// Group labels vary in width too ("Today", "Yesterday", "This week", "March 2026").
const LABEL_WIDTHS = ["w-12", "w-[72px]", "w-16", "w-24"] as const;

// "page" mirrors a History page row, "dialog" mirrors a chat-search-dialog row.
// The two differ in row padding, divider, and where the chevron sits, and the
// skeleton has to match its own host or the list jumps when data lands.
// `groups` is the number of rows in each date group: the page shows several groups, each with its
// label and the same gap between groups as the real list (space-y-6); the dialog is one group.
export function ConversationListSkeleton({
  rows = 4,
  groups,
  label = "Loading conversations…",
  variant = "page",
}: {
  rows?: number;
  groups?: number[];
  label?: string;
  variant?: "page" | "dialog";
}) {
  const isPage = variant === "page";
  const groupRows = groups ?? (isPage ? [2, 3] : [rows]);
  let rowIndex = 0;

  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={isPage ? "space-y-6" : undefined}>
        {groupRows.map((count, groupIndex) => (
          <div key={groupIndex}>
            {/* Real label: 11px text, leading-normal (16.5px), mb-2. */}
            <div className={cn("mb-2 flex h-[16.5px] items-center", isPage ? "px-1" : "px-2")}>
              <Skeleton className={cn("h-2.5", LABEL, LABEL_WIDTHS[groupIndex % LABEL_WIDTHS.length])} />
            </div>
            <div className={isPage ? "divide-y divide-border/60" : "space-y-0.5"}>
              {Array.from({ length: count }, () => {
                const shape = ROW_SHAPES[rowIndex++ % ROW_SHAPES.length];
                return (
                  <div
                    key={rowIndex}
                    className={cn(
                      "flex gap-3 px-2",
                      isPage ? "items-start py-3" : "items-center py-2.5",
                    )}
                  >
                    <Skeleton className={cn("h-9 w-9 shrink-0 rounded-xl", TILE, isPage && "mt-0.5")} />
                    <div className="min-w-0 flex-1">
                      {/* Real title: text-sm (20px line). The page row also has mb-1. A 10px bar sits in it. */}
                      <div className={cn("flex h-5 items-center", isPage && "mb-1")}>
                        <Skeleton className={cn("h-2.5", TEXT, shape.title)} />
                      </div>
                      {/* Real meta row: 10px text, then chips; a chip with py-0.5 is 19px tall. */}
                      <div className={cn("mt-1 flex h-[19px] items-center", isPage ? "gap-3" : "gap-2")}>
                        <Skeleton className={cn("h-[7px]", TEXT, shape.time)} />
                        <Skeleton className={cn("h-[19px] rounded-full", CHIP, shape.reply)} />
                        {shape.pdf && <Skeleton className={cn("h-[19px] w-12 rounded-full", TILE)} />}
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
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
