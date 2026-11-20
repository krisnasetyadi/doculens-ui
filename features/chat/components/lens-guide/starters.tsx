"use client";

import { ChoiceChip } from "./choice-chip";
import { MaterialIcon } from "./material-icon";

// MS-1181, mockup state 1 (Home): shortcuts into the usual chat, not a mode.
// Each one starts the sentence in the composer and leaves the name to the
// user; "project" / "modul" before the name is what lets the server spot a
// one-word folder name in it.
const STARTERS = [
  { icon: "person_add", label: "Saya baru di project", text: "Saya baru di project " },
  { icon: "school", label: "Saya mau mempelajari…", text: "Saya mau mempelajari modul " },
  { icon: "checklist", label: "Saya mau mengerjakan…", text: "Saya mau mengerjakan " },
];

/** The Lens Guide starter chips; `onStart` puts the sentence in the composer. */
export function LensGuideStarters({ onStart }: { onStart: (text: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {STARTERS.map((s) => (
        <ChoiceChip key={s.label} onClick={() => onStart(s.text)}>
          <MaterialIcon name={s.icon} size={16} />
          {s.label}
        </ChoiceChip>
      ))}
    </div>
  );
}
