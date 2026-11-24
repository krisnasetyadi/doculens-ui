"use client";

import { useState } from "react";
import type { GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";
import { firstItemKey, tabOf, type KeyedItem, type ResultTab } from "../_lib/results";

/**
 * Which tab, which requirement and which opened groups a result page shows (MS-1112). Until the user
 * picks, the page opens on the first thing to do (To do tab), or on All when nothing is left to do.
 * The selected requirement is always one the list shows: when it is not in the tab (the user switched
 * tabs, or a corrected status moved it from To do to Done), the tab's first requirement is selected,
 * and an empty tab selects nothing.
 */
export function useResultSelection(items: KeyedItem[], hasTodo: boolean) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [pickedTab, setPickedTab] = useState<ResultTab | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<GapItemStatus>>(new Set());

  const tab: ResultTab = pickedTab ?? (hasTodo ? "todo" : "all");
  const inTabNow = tab === "all" ? items : items.filter((entry) => tabOf(entry.item.status) === tab);
  const selectedKey = inTabNow.some((entry) => entry.key === pickedKey) ? pickedKey : firstItemKey(inTabNow);
  const selected = items.find((entry) => entry.key === selectedKey) ?? null;

  const changeTab = (next: ResultTab) => setPickedTab(next);

  const expand = (status: GapItemStatus) => setExpanded((open) => new Set(open).add(status));

  /** A status row in the summary: its tab, with the group's first requirement selected. */
  const showStatus = (status: GapItemStatus) => {
    setPickedTab(tabOf(status));
    setPickedKey(items.find((entry) => entry.item.status === status)?.key ?? null);
  };

  return { tab, changeTab, selectedKey, selected, select: setPickedKey, expanded, expand, showStatus };
}
