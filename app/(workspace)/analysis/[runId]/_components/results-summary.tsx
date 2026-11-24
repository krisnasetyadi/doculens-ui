"use client";

import { Ban, ChevronRight, CircleAlert, CircleCheck, CircleHelp, CircleX, Info, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";
import { STATUS_META } from "../../_lib/runs";
import { SUMMARY_ROWS, todoCount } from "../_lib/results";

const ROW_ICON: Record<GapItemStatus, { Icon: LucideIcon; className: string }> = {
  missing: { Icon: CircleX, className: "text-destructive" },
  incomplete: { Icon: CircleAlert, className: "text-warning" },
  needs_decision: { Icon: CircleHelp, className: "text-muted-foreground" },
  done: { Icon: CircleCheck, className: "text-success" },
  not_applicable: { Icon: Ban, className: "text-muted-foreground" },
};

/** The top of a result: how many things are left to do and how far along the result is on the left,
 * one row per status on the right (a row opens its group in the list below). Statuses with nothing to
 * do are left out, except Done. */
export function ResultsSummary({
  summary,
  notChecked,
  totalRequirements,
  onShowStatus,
  onCheckAll,
}: {
  summary: Record<GapItemStatus, number>;
  notChecked: number;
  totalRequirements: number;
  /** Shows that status's group in the list, with its first requirement selected. */
  onShowStatus: (status: GapItemStatus) => void;
  /** Opens the New analysis drawer on this analysis, to pick the documents the unchecked requirements need. */
  onCheckAll: () => void;
}) {
  const todo = todoCount(summary);
  const checked = SUMMARY_ROWS.reduce((sum, status) => sum + (summary[status] ?? 0), 0);
  const done = summary.done ?? 0;
  const rows = SUMMARY_ROWS.filter((status) => status === "done" || (summary[status] ?? 0) > 0);

  return (
    <Card className="py-4">
      <CardContent className="grid gap-x-10 gap-y-3 px-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <div className="flex min-w-0 flex-col gap-1.5 md:col-start-1 md:row-start-1">
          <p className="font-manrope text-2xl font-extrabold tabular-nums text-foreground">{summaryHeadline(todo, checked)}</p>
          {checked > 0 && (
            <p className="text-sm tabular-nums text-muted-foreground">
              {done} of {checked} checked {checked === 1 ? "requirement is" : "requirements are"} done
            </p>
          )}
        </div>

        {checked > 0 && (
          <ul className="flex flex-col md:col-start-2 md:row-span-2 md:row-start-1" aria-label="Requirements by status">
            {rows.map((status, index) => {
              const count = summary[status] ?? 0;
              const { Icon, className } = ROW_ICON[status];
              const finished = status === "done" || status === "not_applicable";
              return (
                <li key={status} className={status === "done" && index > 0 ? "mt-1 border-t border-border/60 pt-1" : undefined}>
                  <button
                    type="button"
                    onClick={() => onShowStatus(status)}
                    disabled={count === 0}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
                      finished ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" className={`size-[18px] shrink-0 ${className}`} />
                    <span className="flex-1">{STATUS_META[status].label}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {notChecked > 0 && (
          <p className="flex items-start gap-2 text-[13px] text-muted-foreground md:col-start-1 md:row-start-2 md:self-end">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {notChecked} not checked: {notChecked === 1 ? "its documents weren't" : "their documents weren't"} selected.{" "}
              <button
                type="button"
                onClick={onCheckAll}
                className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:underline"
              >
                Check all {totalRequirements} requirements
              </button>
            </span>
          </p>
        )}

      </CardContent>
    </Card>
  );
}

function summaryHeadline(todo: number, checked: number): string {
  if (checked === 0) return "Nothing was checked";
  if (todo === 0) return "Nothing left to do";
  return `${todo} ${todo === 1 ? "thing" : "things"} to do`;
}
