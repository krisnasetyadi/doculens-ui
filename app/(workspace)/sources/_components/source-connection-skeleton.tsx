import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LIST_HEAD_CLASS, TOOLBAR_CLASS } from "./sources-ui";
import {
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
} from "./sources-ui";

// Tones mirror the real rows: icon tile and buttons are bg-muted; text bars use a
// muted-foreground tint since bg-accent is barely visible on bg-card.
export const SKELETON_TEXT = "bg-muted-foreground/15";
export const SKELETON_CHIP = "bg-muted";

// Row metrics are the real ones (sources-ui ROW_CLASS, ROW_TITLE_CLASS, ROW_META_CLASS):
// 13px/20px title, 11px/16px meta with mt-0.5, size-9 tile, py-3 and px-[11px].
const ROW_CLASS =
  "flex items-center gap-3 border-b px-[11px] py-3 last:border-b-0 max-[620px]:gap-2 max-[620px]:px-[5px]";

/** One placeholder row: icon tile, title and meta lines, then whatever trails the real row. */
export function SourceRowSkeleton({
  index = 0,
  trailing,
}: {
  index?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={ROW_CLASS}>
      <Skeleton className={cn("size-9 shrink-0 rounded-lg", SKELETON_CHIP)} />
      <div className="min-w-0 flex-1">
        <div className="flex h-5 items-center">
          <Skeleton className={cn("h-3.5", SKELETON_TEXT, index % 2 === 0 ? "w-2/5" : "w-1/3")} />
        </div>
        <div className="mt-0.5 flex h-4 items-center">
          <Skeleton className={cn("h-3", SKELETON_TEXT, index % 2 === 0 ? "w-3/5" : "w-1/2")} />
        </div>
      </div>
      {trailing}
    </div>
  );
}

/** The toolbar above a list: title on the left, the tab's main button on the right. */
function ToolbarSkeleton() {
  return (
    <div className={TOOLBAR_CLASS}>
      <Skeleton className={cn("mr-auto h-3.5 w-24", SKELETON_TEXT)} />
      <Skeleton className={cn("h-10 w-28 rounded-xl sm:h-9", SKELETON_CHIP)} />
    </div>
  );
}

/**
 * Loading state for a Sources tab. "files" has the File header and the switch + menu
 * a file row ends with; "connections" (links, databases, Telegram) ends with a chevron.
 */
export function SourceConnectionSkeleton({
  variant = "connections",
  label = "Loading source connections",
  rows = 3,
}: {
  variant?: "files" | "connections";
  label?: string;
  rows?: number;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <ToolbarSkeleton />
        {variant === "files" && <div className={LIST_HEAD_CLASS}>File</div>}
        {Array.from({ length: rows }, (_, index) => (
          <SourceRowSkeleton
            key={index}
            index={index}
            trailing={
              variant === "files" ? (
                <div className="flex shrink-0 items-center gap-3">
                  <Skeleton className={cn("h-[1.15rem] w-8 rounded-full", SKELETON_CHIP)} />
                  <Skeleton className={cn("size-6 rounded-lg", SKELETON_CHIP)} />
                </div>
              ) : (
                <Skeleton className={cn("size-4 shrink-0 rounded-sm", SKELETON_TEXT)} />
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
