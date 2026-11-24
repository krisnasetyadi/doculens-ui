"use client";

import { useRef, useState, type RefObject } from "react";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Flag,
  ListChecks,
  MapPin,
  MapPinPlus,
  PencilLine,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GapAnalysisFinding, GapAnalysisPointer, GapItemStatus } from "@/services/gap-analysis/type/gap-analysis.type";
import { STATUS_META } from "../../_lib/runs";
import { canOpen, correctionNote, nextStepButton, trendText, type KeyedItem } from "../_lib/results";
import { useCorrection } from "../_hooks/use-correction";
import { CorrectionDialog } from "./correction-dialog";

const SOURCES_HREF = "/sources";

const SECTION_LABEL = "font-manrope text-[11px] font-bold uppercase tracking-[0.12em]";

/** One requirement in full (MS-1112), top to bottom: what it is and how it moved, what is missing,
 * what to do next, what the AI found (each with a pointer to its place), then other actions.
 * "AI got this wrong?" and "Decide the status" open the correction dialog (MS-1115). */
export function RequirementDetail({
  entry,
  runId,
  runDocumentIds,
  canRemember,
  previousRunAt,
  onOpenPointer,
}: {
  entry: KeyedItem;
  runId: string;
  /** The run's own documents, offered first when pointing at one the AI missed. */
  runDocumentIds: string[];
  /** Whether a correction can be remembered in the analysis's rule set. */
  canRemember: boolean;
  /** When the run this one's trend compares against was checked ("05 Nov 2026"). */
  previousRunAt: string | null;
  onOpenPointer: (pointer: GapAnalysisPointer) => void;
}) {
  const { item } = entry;
  const [correcting, setCorrecting] = useState(false);
  // After a save or an undo the pressed button is usually gone (the item changed, or another one is
  // selected), so focus goes to the title of the requirement now shown.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = () => headingRef.current?.focus();
  const correction = useCorrection(runId, focusHeading);
  const itemId = item.item_id ?? null;
  const correct = itemId === null ? null : () => setCorrecting(true);

  return (
    <Card className="min-w-0 flex-[1.3_1_460px] gap-5 px-6 py-6">
      <DetailHeader
        item={item}
        headingRef={headingRef}
        previousRunAt={previousRunAt}
        onUndo={itemId === null ? null : () => correction.undo(itemId, item.correction?.direction ?? null)}
        undoing={itemId !== null && correction.undoingItemId === itemId}
      />
      <WhatIsMissing item={item} />
      <NextStep item={item} onOpenPointer={onOpenPointer} onDecide={correct} />
      <WhatTheAiFound findings={item.findings} onOpenPointer={onOpenPointer} />
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button asChild variant="outline" size="sm">
          <Link href={SOURCES_HREF}>
            <Upload aria-hidden="true" className="size-4" />
            Upload new version
          </Link>
        </Button>
        {correct && (
          <Button variant="outline" size="sm" onClick={correct} icon={<Flag className="size-4" />}>
            AI got this wrong?
          </Button>
        )}
      </footer>
      {itemId !== null && (
        <CorrectionDialog
          open={correcting}
          onOpenChange={setCorrecting}
          item={item}
          runDocumentIds={runDocumentIds}
          canRemember={canRemember}
          onSave={(body) => correction.save(itemId, body)}
          onClosed={focusHeading}
        />
      )}
    </Card>
  );
}

type Item = KeyedItem["item"];

const TREND_STYLE = {
  improved: { Icon: TrendingUp, className: "text-success-ink" },
  worse: { Icon: TrendingDown, className: "text-danger-ink" },
  unchanged: { Icon: null, className: "text-muted-foreground" },
} as const;

function DetailHeader({
  item,
  headingRef,
  previousRunAt,
  onUndo,
  undoing,
}: {
  item: Item;
  headingRef: RefObject<HTMLHeadingElement | null>;
  previousRunAt: string | null;
  onUndo: (() => void) | null;
  undoing: boolean;
}) {
  const meta = STATUS_META[item.status];
  const trend = trendText(item.trend, previousRunAt);
  const trendStyle = item.trend ? TREND_STYLE[item.trend] : null;
  const corrected = correctionNote(item);
  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={meta.badge}>{meta.label}</Badge>
        {item.code && <span className="text-[13px] text-muted-foreground">{item.code}</span>}
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="font-manrope text-xl font-extrabold text-foreground focus:outline-none">
        {item.label}
      </h2>
      {trend && trendStyle && (
        <p className={`flex items-center gap-1.5 text-[13px] font-semibold ${trendStyle.className}`}>
          {trendStyle.Icon && <trendStyle.Icon aria-hidden="true" className="size-4" />}
          {trend}
        </p>
      )}
      {corrected && (
        <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-info-ink">
          <PencilLine aria-hidden="true" className="size-4" />
          {corrected}
          {onUndo && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onUndo}
                disabled={undoing}
                className="font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                {undoing ? "Undoing…" : "Undo correction"}
              </button>
            </>
          )}
        </p>
      )}
    </header>
  );
}

const BOX: Record<GapItemStatus, { box: string; ink: string }> = {
  missing: { box: "border-danger-ink/25 bg-danger-soft", ink: "text-danger-ink" },
  incomplete: { box: "border-warning/30 bg-warning-soft", ink: "text-warning-ink" },
  needs_decision: { box: "border-border bg-muted/50", ink: "text-muted-foreground" },
  done: { box: "border-success/25 bg-success-soft", ink: "text-success-ink" },
  not_applicable: { box: "border-border bg-muted/50", ink: "text-muted-foreground" },
};

function WhatIsMissing({ item }: { item: Item }) {
  const { box, ink } = BOX[item.status];
  return (
    <section className={`flex flex-col gap-1.5 rounded-lg border px-4 py-3 ${box}`}>
      <h3 className={`${SECTION_LABEL} ${ink}`}>{STATUS_META[item.status].detailTitle}</h3>
      <p className="text-[15px] text-foreground">{item.summary || item.reason || "No details were recorded for this requirement."}</p>
    </section>
  );
}

function NextStep({
  item,
  onOpenPointer,
  onDecide,
}: {
  item: Item;
  onOpenPointer: (pointer: GapAnalysisPointer) => void;
  onDecide: (() => void) | null;
}) {
  const step = nextStepButton(item, { canDecide: !!onDecide });
  if (!step) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className={`${SECTION_LABEL} text-muted-foreground`}>Next step</h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {step.kind === "open" && (
          <Button onClick={() => onOpenPointer(step.pointer)} icon={<MapPin className="size-4" />}>
            {step.label}
          </Button>
        )}
        {step.kind === "decide" && onDecide && (
          <Button onClick={onDecide} icon={<ListChecks className="size-4" />}>
            {step.label}
          </Button>
        )}
        {step.kind === "upload" && (
          <Button asChild>
            <Link href={SOURCES_HREF}>
              <Upload aria-hidden="true" className="size-4" />
              {step.label}
            </Link>
          </Button>
        )}
        <p className="basis-full text-[13px] text-muted-foreground">{step.explain}</p>
      </div>
    </section>
  );
}

const VERDICT_ICON = {
  met: { Icon: CircleCheck, className: "text-success" },
  partial: { Icon: CircleAlert, className: "text-warning" },
  missing: { Icon: CircleX, className: "text-destructive" },
} as const;

function WhatTheAiFound({
  findings,
  onOpenPointer,
}: {
  findings: GapAnalysisFinding[];
  onOpenPointer: (pointer: GapAnalysisPointer) => void;
}) {
  return (
    <section className="flex flex-col">
      <h3 className={`${SECTION_LABEL} pb-1 text-muted-foreground`}>What the AI found</h3>
      {findings.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing was recorded for this requirement.</p>}
      <ul>
        {findings.map((finding, i) => {
          const { Icon, className } = VERDICT_ICON[finding.verdict] ?? VERDICT_ICON.partial;
          return (
            <li key={i} className="flex items-start gap-2.5 border-t border-border/60 py-3 text-sm first:border-t-0">
              <Icon aria-hidden="true" className={`mt-0.5 size-[18px] shrink-0 ${className}`} />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="text-foreground">{finding.text}</span>
                {finding.quote && <q className="text-[13px] italic text-muted-foreground">{finding.quote}</q>}
                <div className="flex max-w-full flex-wrap gap-1.5">
                  <FindingPlace finding={finding} onOpenPointer={onOpenPointer} />
                  {finding.added_by && (
                    <span className={`${CHIP} bg-muted text-muted-foreground`}>
                      <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
                      Added by {finding.added_by}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const CHIP = "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold";

/** Where a finding is: a pointer that opens the place, the place a missing part should go, or where
 * the AI looked. A pointer that can't be opened still names its place. */
function FindingPlace({
  finding,
  onOpenPointer,
}: {
  finding: GapAnalysisFinding;
  onOpenPointer: (pointer: GapAnalysisPointer) => void;
}) {
  const { location, suggested_place: suggestedPlace, searched } = finding;
  if (canOpen(location)) {
    return (
      <button
        type="button"
        onClick={() => onOpenPointer(location)}
        className={`${CHIP} bg-info-soft text-info-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{location.label}</span>
      </button>
    );
  }
  if (location) {
    return (
      <span className={`${CHIP} bg-info-soft text-info-ink`}>
        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{location.label}</span>
      </span>
    );
  }
  if (suggestedPlace) {
    return (
      <span className={`${CHIP} bg-warning-soft text-warning-ink`}>
        <MapPinPlus aria-hidden="true" className="size-3.5 shrink-0" />
        Suggested place: {suggestedPlace}
      </span>
    );
  }
  if (searched) {
    return (
      <span className={`${CHIP} bg-muted text-muted-foreground`}>
        <Search aria-hidden="true" className="size-3.5 shrink-0" />
        {searched}
      </span>
    );
  }
  return null;
}
