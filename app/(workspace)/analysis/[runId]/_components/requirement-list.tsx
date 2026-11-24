"use client";

import { ChevronRight, PencilLine, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";
import { STATUS_META } from "../../_lib/runs";
import {
  TAB_LABEL,
  groupItems,
  tabCounts,
  type KeyedItem,
  type ResultTab,
} from "../_lib/results";

const DOT: Record<GapItemStatus, string> = {
  missing: "bg-destructive",
  incomplete: "bg-warning",
  needs_decision: "bg-muted-foreground/50",
  done: "bg-success",
  not_applicable: "bg-border",
};

/** The requirements of a result in three tabs (To do / Done / All), grouped by status with what needs
 * doing first, a few rows per group until the user asks for more (MS-1112). */
export function RequirementList({
  items,
  tab,
  onTabChange,
  selectedKey,
  onSelect,
  expanded,
  onExpand,
}: {
  items: KeyedItem[];
  tab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  expanded: ReadonlySet<GapItemStatus>;
  onExpand: (status: GapItemStatus) => void;
}) {
  const counts = tabCounts(items);
  const groups = groupItems(items, tab, selectedKey, expanded);

  return (
    <Card className="min-w-0 flex-[1_1_420px] gap-0 overflow-hidden py-0">
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as ResultTab)} className="gap-0">
        <div className="border-b px-4 pt-3 pb-2">
          <TabsList>
            {(Object.keys(TAB_LABEL) as ResultTab[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {TAB_LABEL[key]}
                <span className="font-semibold tabular-nums text-muted-foreground">{counts[key]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* One panel, refilled per tab: the tab's aria-controls points at it. */}
        <TabsContent value={tab}>
          {groups.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              {tab === "todo" ? "Nothing to do here: every checked requirement is done." : "No requirements here."}
            </p>
          )}

          {groups.map((group) => (
            <section key={group.status} aria-labelledby={`group-${group.status}`}>
              <h3
                id={`group-${group.status}`}
                title={STATUS_META[group.status].hint}
                className="flex items-center gap-2 px-5 pt-4 pb-1.5 text-[13px]"
              >
                <span aria-hidden="true" className={`size-2 rounded-full ${DOT[group.status]}`} />
                <span className="font-manrope font-extrabold text-foreground">{STATUS_META[group.status].label}</span>
                <span className="font-semibold tabular-nums text-muted-foreground">{group.total}</span>
              </h3>
              <ul>
                {group.rows.map(({ key, item }) => {
                  const selected = key === selectedKey;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => onSelect(key)}
                        aria-current={selected ? "true" : undefined}
                        className={`flex w-full items-center gap-3 border-t border-border/60 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                          selected ? "bg-primary/[0.06] shadow-[inset_3px_0_0_var(--primary)]" : ""
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="line-clamp-2 text-sm font-semibold text-foreground">{item.label}</span>
                            {item.code && <span className="shrink-0 text-xs text-muted-foreground">{item.code}</span>}
                            {item.correction && (
                              <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full bg-info-soft px-2 py-px text-[11px] font-semibold text-info-ink">
                                <PencilLine aria-hidden="true" className="size-3" />
                                Corrected
                              </span>
                            )}
                          </span>
                          {item.reason && <span className="truncate text-sm text-muted-foreground">{item.reason}</span>}
                        </span>
                        <TrendMark trend={item.trend} />
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {group.hidden > 0 && (
                <button
                  type="button"
                  onClick={() => onExpand(group.status)}
                  className="w-full border-t border-border/60 px-5 py-3 text-left text-sm font-semibold text-primary hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  Show {group.hidden} more
                </button>
              )}
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/** Improved or Worse next to a row; an unchanged item shows nothing, so movement stands out. */
export function TrendMark({ trend }: { trend: KeyedItem["item"]["trend"] }) {
  if (trend === "improved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-success-ink">
        <TrendingUp aria-hidden="true" className="size-4" />
        Improved
      </span>
    );
  }
  if (trend === "worse") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-danger-ink">
        <TrendingDown aria-hidden="true" className="size-4" />
        Worse
      </span>
    );
  }
  return null;
}
