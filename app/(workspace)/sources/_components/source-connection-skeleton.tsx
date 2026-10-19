import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SKELETON_TONE } from "@/lib/skeleton-tones";
import { FOLDER_CARD_CLASS, FOLDER_GRID_CLASS, SECTION_LABEL_CLASS, TOOLBAR_CLASS, TOOLBAR_TITLE_CLASS, SECTION_HEAD_CLASS } from "./sources-ui";
import { useFoldersView } from "../_hooks/use-folders-view";

// Tones mirror the real rows: icon tile and buttons are chips, text bars are text.
const SKELETON_TEXT = SKELETON_TONE.text;
const SKELETON_CHIP = SKELETON_TONE.chip;

// Row metrics are the real ones (sources-ui ROW_CLASS, ROW_TITLE_CLASS, ROW_META_CLASS):
// 13px/20px title, 11px/16px meta with mt-0.5, size-9 tile, py-3 and px-[11px]. The bars keep the
// text's hierarchy inside those line boxes: a title bar that is thicker and shorter, a meta bar that
// is thinner and longer (title 9px, meta 7px; widths follow the reference, cycled per row).
const TITLE_WIDTHS = ["w-[62%]", "w-[49%]", "w-[55%]"];
const META_WIDTHS = ["w-[73%]", "w-[69%]", "w-[49%]"];
const FOLDER_NAME_WIDTHS = ["w-[55%]", "w-[49%]", "w-[60%]"];
const ROW_CLASS =
  "flex items-center gap-3 px-[11px] max-[620px]:gap-2 max-[620px]:px-[5px]";
// A folder row's own metrics (sources-ui FOLDER_ROW_CLASS): py-1 around the 28px menu button.
const FOLDER_ROW_CLASS =
  "flex items-center gap-3 px-[11px] py-1 max-[620px]:gap-2 max-[620px]:px-[5px]";

/** One placeholder row: icon tile, title and meta lines, then whatever trails the real row. */
export function SourceRowSkeleton({
  index = 0,
  trailing,
  compact = false,
}: {
  index?: number;
  trailing?: React.ReactNode;
  /** A file row: at least 58px with 8px of padding (sources-ui ROW_CLASS). The default is a connection row, 12px of padding. */
  compact?: boolean;
}) {
  return (
    <div className={cn(ROW_CLASS, compact ? "min-h-[58px] py-2" : "py-3")}>
      <Skeleton className={cn("size-9 shrink-0", SKELETON_CHIP)} />
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

/**
 * Loading state for the connection tabs (links, databases, Telegram): rows end with a chevron.
 * The toolbar (the title and the tab's main button) needs no data, so the tab passes it in and it
 * renders for real, disabled, the way the Files tab does; only what comes from the server is a
 * placeholder.
 */
export function SourceConnectionSkeleton({
  label = "Loading source connections…",
  rows = 3,
  title,
  toolbar,
}: {
  label?: string;
  rows?: number;
  /** The toolbar's title ("All links"), real text like the button beside it. */
  title?: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <>
      {toolbar && (
        <div className={TOOLBAR_CLASS}>
          {title && <span className={TOOLBAR_TITLE_CLASS}>{title}</span>}
          {toolbar}
        </div>
      )}
      <div role="status">
        <span className="sr-only">{label}</span>
        <div aria-hidden="true">
          {Array.from({ length: rows }, (_, index) => (
            <SourceRowSkeleton
              key={index}
              index={index}
              trailing={<Skeleton className={cn("size-4 shrink-0", SKELETON_TEXT)} />}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/** The folder cards (the default view): same grid and metrics as the real cards, tile, two text lines and the menu slot. */
function FolderCardsSkeleton() {
  return (
    <div className={FOLDER_GRID_CLASS}>
      {FOLDER_NAME_WIDTHS.concat("w-[52%]").map((width, index) => (
        <div key={index} className={FOLDER_CARD_CLASS}>
          <Skeleton className={cn("size-9 shrink-0", SKELETON_CHIP)} />
          <div className="min-w-0 flex-1">
            <div className="flex h-5 items-center">
              <Skeleton className={cn("h-[9px]", SKELETON_TEXT, width)} />
            </div>
            <div className="flex h-4 items-center">
              <Skeleton className={cn("h-[7px] w-[34px]", SKELETON_TEXT)} />
            </div>
          </div>
          <div className="size-7 shrink-0" />
          <div className="size-7 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** The folder rows (the list view): slim rows with the real row's metrics. */
function FolderRowsSkeleton() {
  return (
    <>
      {FOLDER_NAME_WIDTHS.map((width, index) => (
        <div key={index} className={FOLDER_ROW_CLASS}>
          <span className="flex w-9 shrink-0 justify-center">
            <Skeleton className={cn("size-[18px]", SKELETON_CHIP)} />
          </span>
          <div className="min-w-0 flex-1">
            <Skeleton className={cn("h-[9px]", SKELETON_TEXT, width)} />
          </div>
          <Skeleton className={cn("h-[7px] w-[34px] shrink-0", SKELETON_TEXT)} />
          {/* The folder menu button's slot (28px), so the row is as tall as a real one. */}
          <div className="size-7 shrink-0" />
        </div>
      ))}
    </>
  );
}

/**
 * The Folders section on its own. Folders load apart from files, so when the files are already on
 * screen and the folders are not, this holds their place above the list: the header, which needs
 * no data, and cards or rows to match the view the person last chose.
 */
export function FoldersSkeleton() {
  const { open, view } = useFoldersView();
  return (
    <div aria-hidden="true" className="mb-3">
      <div className={SECTION_HEAD_CLASS}>
        <span className={SECTION_LABEL_CLASS}>Folders</span>
      </div>
      {open && (view === "grid" ? <FolderCardsSkeleton /> : <FolderRowsSkeleton />)}
    </div>
  );
}

/**
 * Loading state for the Files list only. The toolbar (All files, New) and the
 * "Files" header need no data, so the tab renders them for real; only what comes from the server
 * is a placeholder: the folder rows and the file rows (name, meta, switch, menu).
 */
export function FilesListSkeleton({ label = "Loading files…", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <FoldersSkeleton />
        <div className={cn(SECTION_HEAD_CLASS, "mb-0.5")}>
          <span className={SECTION_LABEL_CLASS}>Files</span>
        </div>
        <div>
          {Array.from({ length: rows }, (_, index) => (
            <SourceRowSkeleton
              key={index}
              index={index}
              compact
              trailing={
                <div className="flex shrink-0 items-center gap-3">
                  <Skeleton className={cn("h-[1.15rem] w-8 rounded-full", SKELETON_CHIP)} />
                  <Skeleton className={cn("size-6", SKELETON_CHIP)} />
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

