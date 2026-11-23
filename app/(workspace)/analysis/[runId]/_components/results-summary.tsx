"use client";

import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";
import { STATUS_META } from "../../_lib/runs";
import { BAR_ORDER, todoCount } from "../_lib/results";

/** The top of a result (MS-1112): how many things are left to do, a bar of every checked requirement
 * by status, and how many were not checked because their kind of document was not selected. */
export function ResultsSummary({
  summary,
  notChecked,
  totalRequirements,
  onCheckAll,
}: {
  summary: Record<GapItemStatus, number>;
  notChecked: number;
  totalRequirements: number;
  /** Opens the New analysis drawer on this analysis, to pick the documents the unchecked requirements need. */
  onCheckAll: () => void;
}) {
  const todo = todoCount(summary);
  const done = summary.done ?? 0;
  const checked = BAR_ORDER.reduce((sum, status) => sum + (summary[status] ?? 0), 0);
  const notApplicable = summary.not_applicable ?? 0;
  const headline = summaryHeadline(todo, checked);
  const barLabel = BAR_ORDER.filter((s) => summary[s])
    .map((s) => `${summary[s]} ${STATUS_META[s].label.toLowerCase()}`)
    .join(", ");

  return (
    <Card className="py-4">
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
          <p className="font-manrope text-xl font-extrabold tabular-nums text-foreground">{headline}</p>
          {checked > 0 && (
            <div role="img" aria-label={barLabel} className="flex h-2 overflow-hidden rounded-full bg-muted">
              {BAR_ORDER.map((status) =>
                summary[status] ? (
                  <span
                    key={status}
                    className={STATUS_META[status].bar}
                    style={{ width: `${(summary[status] / checked) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
          )}
          <p className="text-sm tabular-nums text-muted-foreground">
            {done} done · {todo} to do · of {checked} {checked === 1 ? "requirement" : "requirements"} checked
            {notApplicable > 0 && ` · ${notApplicable} not applicable`}
          </p>
        </div>
        {notChecked > 0 && (
          <div className="flex flex-[0_1_360px] items-start gap-2.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              {notChecked} other {notChecked === 1 ? "requirement was" : "requirements were"} <b className="text-foreground">not checked</b>{" "}
              because {notChecked === 1 ? "its documents were" : "their documents were"} not selected. That does not mean they are missing.{" "}
              <button
                type="button"
                onClick={onCheckAll}
                className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:underline"
              >
                Check all {totalRequirements} requirements
              </button>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function summaryHeadline(todo: number, checked: number): string {
  if (checked === 0) return "Nothing was checked";
  if (todo === 0) return "Everything checked is done";
  return `${todo} ${todo === 1 ? "thing" : "things"} to do`;
}
