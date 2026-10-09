import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SKELETON_TONE } from "@/lib/skeleton-tones";
import { LIST_HEAD_CLASS, TOOLBAR_CLASS } from "./sources-ui";

// Tones mirror the real rows: icon tile and buttons are chips, text bars are text.
const SKELETON_TEXT = SKELETON_TONE.text;
const SKELETON_CHIP = SKELETON_TONE.chip;

// Row metrics are the real ones (sources-ui ROW_CLASS, ROW_TITLE_CLASS, ROW_META_CLASS):
// 13px/20px title, 11px/16px meta with mt-0.5, size-9 tile, py-3 and px-[11px]. The bars keep the
// text's hierarchy inside those line boxes: a title bar that is thicker and shorter, a meta bar that
// is thinner and longer (title 9px, meta 7px; widths follow the reference, cycled per row).
const TITLE_WIDTHS = ["w-[62%]", "w-[49%]", "w-[55%]"];
const META_WIDTHS = ["w-[73%]", "w-[69%]", "w-[49%]"];
const FOLDER_NAME_WIDTHS = ["w-[55%]", "w-[49%]", "w-[60%]", "w-[52%]"];
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
          <Skeleton className={cn("h-[9px]", SKELETON_TEXT, TITLE_WIDTHS[index % TITLE_WIDTHS.length])} />
        </div>
        <div className="mt-0.5 flex h-4 items-center">
          <Skeleton className={cn("h-[7px]", SKELETON_TEXT, META_WIDTHS[index % META_WIDTHS.length])} />
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

/** Loading state for the connection tabs (links, databases, Telegram): rows end with a chevron. */
export function SourceConnectionSkeleton({
  label = "Loading source connections…",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <ToolbarSkeleton />
        {Array.from({ length: rows }, (_, index) => (
          <SourceRowSkeleton
            key={index}
            index={index}
            trailing={<Skeleton className={cn("size-4 shrink-0 rounded-sm", SKELETON_TEXT)} />}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The folder cards on their own. Folders load apart from files, so when the files are already on
 * screen and the folders are not, this holds their place above the list.
 */
export function FolderCardsSkeleton() {
  // Same grid as the real folder cards. Four fill two rows at two columns; the fourth drops out at
  // three columns so that row stays full, and two remain on a phone.
  return (
    <div aria-hidden="true" className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-2.5 rounded-xl border bg-card py-[11px] pl-3 pr-2",
            index >= 2 && "max-sm:hidden",
            index === 3 && "lg:hidden",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className={cn("size-[18px] shrink-0 rounded-sm", SKELETON_CHIP)} />
            <Skeleton className={cn("h-[9px]", SKELETON_TEXT, FOLDER_NAME_WIDTHS[index % FOLDER_NAME_WIDTHS.length])} />
            <Skeleton className={cn("ml-auto h-[7px] w-[34px] shrink-0", SKELETON_TEXT)} />
          </div>
          {/* The folder menu button's slot, so the card is as tall as a real one. */}
          <div className="size-6 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Loading state for the Files list only. The toolbar (All files, New folder, Add files) and the
 * "File" header need no data, so the tab renders them for real; only what comes from the server
 * is a placeholder: the folder cards and the file rows (name, meta, switch, menu).
 */
export function FilesListSkeleton({
  label = "Loading files…",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <FolderCardsSkeleton />
        <div className={LIST_HEAD_CLASS}>File</div>
        {Array.from({ length: rows }, (_, index) => (
          <SourceRowSkeleton
            key={index}
            index={index}
            trailing={
              <div className="flex shrink-0 items-center gap-3">
                <Skeleton className={cn("h-[1.15rem] w-8 rounded-full", SKELETON_CHIP)} />
                <Skeleton className={cn("size-6 rounded-lg", SKELETON_CHIP)} />
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
