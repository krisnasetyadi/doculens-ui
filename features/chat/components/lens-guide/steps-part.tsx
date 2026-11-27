"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { PdfSourceInfo } from "@/services/types";
import { Notice, NoticeLead } from "@/components/notice";
import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";
import { TextPreviewDialog, type TextPreviewSource } from "@/features/sources/components/text-preview-dialog";
import type { GuidePartProps } from "./guide-block";
import { MaterialIcon } from "./material-icon";
import { GuideSourceLink, deckPreview } from "./source-link";
import { guideSourceLocation, isSlideDeck } from "@/features/chat/lib/guide-source-link";

// Mockup ".src" pill: a location is info (the same wash as Analysis pointers), the origin folder neutral.
const PILL = "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-left font-inter text-xs font-semibold";
const LOCATION_PILL = `${PILL} bg-info-soft text-info-ink`;
const LOCATION_CHIP = `${LOCATION_PILL} transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:no-underline`;
const ORIGIN_CHIP = `${PILL} bg-muted text-foreground`;

// Mockup: a conflict is a warning, a missing part or an ignored old version is information.
const NOTICE_TONE = { conflict: "warning", missing: "info", old_version: "info" } as const;
const NOTICE_LEAD: Partial<Record<keyof typeof NOTICE_TONE, string>> = { conflict: "Dua dokumen berbeda." };
// Every note carries a thin outline in its own tone (the warning's follows the app's warning boxes).
const NOTICE_OUTLINE = { warning: "border border-warning/30", info: "border border-info-ink/25" } as const;

/** Reading/work steps with the same source viewers as SourcesSection. */
export function StepsPart({ guide, onOpenSource }: GuidePartProps) {
  const [deck, setDeck] = useState<TextPreviewSource | null>(null);
  const openSource = (source: PdfSourceInfo) => {
    if (isSlideDeck(source.file_name)) {
      setDeck(deckPreview(source));
    } else {
      onOpenSource?.(source);
    }
  };
  return (
    <>
      {!!guide.steps?.length && (
        <Panel padding="md">
          <ol className="divide-y divide-border/50">
            {guide.steps.map((step) => {
              const sources = step.sources?.length ? step.sources : step.source ? [step.source] : [];
              return (
                <li key={step.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-manrope text-xs font-extrabold text-foreground">
                    {step.key}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words font-manrope text-sm font-bold text-foreground">{step.title}</p>
                    <p className="break-words font-inter text-[13px] leading-[1.55] text-muted-foreground">{step.why}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {sources.length ? sources.map((source, sourceIndex) => (
                        <button key={`${source.collection_id}/${source.file_name}/${source.page}`} type="button"
                          className={LOCATION_CHIP} onClick={() => openSource(source)}
                          disabled={!isSlideDeck(source.file_name) && !onOpenSource}
                          aria-label={`Buka ${source.file_name}, ${guideSourceLocation(step.where, sourceIndex)}`}>
                          <MaterialIcon name="location_on" size={14} />
                          <span className="min-w-0 break-words">{source.file_name}, {guideSourceLocation(step.where, sourceIndex)}</span>
                        </button>
                      )) : (
                        <span className={LOCATION_PILL}>
                          <MaterialIcon name="location_on" size={14} />
                          <span className="min-w-0 break-words">{step.file}, {step.where}</span>
                        </span>
                      )}
                      {step.origin && (
                        <span className={ORIGIN_CHIP}>
                          <MaterialIcon name="folder_shared" size={14} />
                          <span className="min-w-0 break-words">dari {step.origin}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {!!step.minutes && (
                    <span className="shrink-0 whitespace-nowrap font-inter text-[13px] text-muted-foreground">{step.minutes} mnt</span>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
      {guide.notices?.map((notice, index) => (
        // Chat-sized like the mockup's note (14px, 18px icon).
                <Notice key={`${notice.kind}/${index}`} tone={NOTICE_TONE[notice.kind]} role="note"
          className={cn("gap-2.5 break-words px-3.5 py-3 text-sm leading-relaxed [&_a]:underline [&>svg]:mt-0.5 [&>svg]:size-[18px]",
            NOTICE_OUTLINE[NOTICE_TONE[notice.kind]])}>
          {NOTICE_LEAD[notice.kind] && <><NoticeLead>{NOTICE_LEAD[notice.kind]}</NoticeLead>{" "}</>}
          {/* Notice is a <p>: markdown paragraphs render inline inside it. */}
          <ReactMarkdown components={{
            p: ({ children }) => <>{children}</>,
            a: ({ node: _node, ...link }) => <GuideSourceLink {...link} onOpenSource={onOpenSource} />,
          }}>{notice.text}</ReactMarkdown>
        </Notice>
      ))}
      <TextPreviewDialog source={deck} onClose={() => setDeck(null)} />
    </>
  );
}
