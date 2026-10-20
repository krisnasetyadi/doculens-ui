import type { ReactNode } from "react";
import { SortBar } from "./sort-bar";
import { TOOLBAR_CLASS, TOOLBAR_TITLE_CLASS } from "./sources-ui";
import type { SortDir, SortKey } from "../_types/sources.type";

/** The bar over a connection tab (links, chats, databases): "All ..." on the left; on the right the sort
 * and the tab's one main action, laid out like the Files tab's bar. Connections have no file type, so
 * that sort option is left out. */
export function ConnectionToolbar({
  title,
  sort,
  onSort,
  action,
}: {
  title: string;
  /** Left out while there is nothing to order yet (loading, or a single connection). */
  sort?: { key: SortKey; dir: SortDir };
  onSort?: (key: SortKey) => void;
  action: ReactNode;
}) {
  return (
    <div className={TOOLBAR_CLASS}>
      <span className={TOOLBAR_TITLE_CLASS}>{title}</span>
      {sort && onSort && <SortBar labeled hiddenKeys={["type"]} sort={sort} onToggle={onSort} />}
      {action}
    </div>
  );
}
