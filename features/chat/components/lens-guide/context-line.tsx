"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/services";
import { ChoiceChip } from "./choice-chip";

/** MS-1182: "Konteks yang saya pakai" above an answer from one folder (mockup
 * state 2). "Ubah" opens the other choices of each item, which come with this
 * answer; picking one sends "Ganti <label> jadi <choice> di folder <path>" as the
 * user's reply. The folder path keeps it working once the folder card has left
 * the chat history the server keeps (the last 5 questions).
 * The folder itself has no choices: naming another folder changes it. */
export function ContextLine({ context, active, onPick }: {
  context: NonNullable<Guide["context"]>;
  /** Only the latest answer can be changed. */
  active: boolean;
  onPick: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const folder = context.find((c) => c.label === "Project")?.value;
  const changeable = context
    .map((c) => ({ ...c, options: (c.options ?? []).filter((o) => o !== c.value) }))
    .filter((c) => c.options.length > 0);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 font-inter text-[13px] text-muted-foreground">Konteks yang saya pakai:</span>
        {context.map((c) => (
          <span
            key={c.label}
            title={c.label}
            className="rounded-full bg-selected px-2.5 py-0.5 font-manrope text-xs font-bold text-primary-pressed dark:text-primary"
          >
            {c.value}
          </span>
        ))}
        {changeable.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            disabled={!active}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Ubah
          </Button>
        )}
      </div>
      {open && active && (
        <div className="space-y-2">
          {changeable.map((c) => (
            <div key={c.label} className="flex flex-wrap items-center gap-2">
              <span className="font-inter text-[13px] text-muted-foreground">{c.label}:</span>
              {c.options.map((option) => (
                <ChoiceChip key={option} onClick={() => onPick(`Ganti ${c.label} jadi ${option}${folder ? ` di folder ${folder}` : ""}`)}>
                  {option}
                </ChoiceChip>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
