"use client";

import { useState } from "react";
import type { GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";
import { firstItemKey, tabOf, type KeyedItem, type ResultTab } from "../_lib/results";

/**
 * Which tab, which requirement and which opened groups a result page shows (MS-1112). Until the user
 * picks, the page opens on the first thing to do (To do tab), or on All when nothing is left to do.
 * The selected requirement always stays visible: leaving its tab selects the new tab's first one.
 */
export function useResultSelection(items: KeyedItem[], hasTodo: boolean) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [pickedTab, setPickedTab] = useState<ResultTab | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<GapItemStatus>>(new Set());

  const selectedKey = items.some((entry) => entry.key === pickedKey) ? pickedKey : firstItemKey(items);
  const selected = items.find((entry) => entry.key === selectedKey) ?? null;
  const tab: ResultTab = pickedTab ?? (hasTodo ? "todo" : "all");

  const changeTab = (next: ResultTab) => {
    setPickedTab(next);
    if (selected && next !== "all" && tabOf(selected.item.status) !== next) {
      setPickedKey(firstItemKey(items.filter((entry) => tabOf(entry.item.status) === next)));
    }
  };

  const expand = (status: GapItemStatus) => setExpanded((open) => new Set(open).add(status));

  return { tab, changeTab, selectedKey, selected, select: setPickedKey, expanded, expand };
}
