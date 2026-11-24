"use client";

import { ChoiceChip } from "./choice-chip";
import { NotThisFolder } from "./folder-part";
import type { GuidePartProps } from "./guide-block";

/** MS-1182: the one context question's answers, taken from the folder's
 * documents. A chip sends its text as the user's reply; typing one's own is
 * always allowed. With a folder card (mockup state 2) answering confirms the
 * folder, so "Bukan folder ini" sits under the answers instead. */
export function ClarifyPart({ guide, active, onPick }: GuidePartProps) {
  const question = guide.question;
  if (!question?.options.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {question.options.map((option) => (
          <ChoiceChip key={option} disabled={!active} onClick={() => onPick(option)}>
            {option}
          </ChoiceChip>
        ))}
        {question.allow_free_text && (
          <span className="font-inter text-[13px] text-muted-foreground">atau ketik jawabanmu sendiri</span>
        )}
      </div>
      {guide.folder && <NotThisFolder active={active} onPick={onPick} />}
    </div>
  );
}
