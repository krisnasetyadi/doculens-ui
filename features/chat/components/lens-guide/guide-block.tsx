"use client";

import type { Guide } from "@/services";
import { ClarifyPart } from "./clarify-part";
import { FolderPart } from "./folder-part";
import { ImportPart } from "./import-part";
import { StepsPart } from "./steps-part";

export interface GuidePartProps {
  guide: Guide;
  /** Only the latest answer's choices can be clicked. */
  active: boolean;
  /** Sends the text as the user's next message. */
  onPick: (text: string) => void;
}

/** Lens Guide cards under an answer (MS-1179). Each story fills its own part. */
export function GuideBlock(props: GuidePartProps) {
  return (
    <div className="space-y-3">
      <FolderPart {...props} />
      <ImportPart {...props} />
      <ClarifyPart {...props} />
      <StepsPart {...props} />
    </div>
  );
}
