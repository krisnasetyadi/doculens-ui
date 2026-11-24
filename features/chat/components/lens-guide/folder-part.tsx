"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/panel";
import type { GuideFolder } from "@/services";
import { ChoiceChip } from "./choice-chip";
import type { GuidePartProps } from "./guide-block";
import { MaterialIcon } from "./material-icon";

// MS-1181: the folder the user named. One match is confirmed, several are
// picked from, none asks where the documents are. Every choice is sent as a
// message carrying the folder's full path, which is how the next turn knows
// the scope (the cards themselves are not saved).

const label = (f: GuideFolder) => f.path.join(" › ");

function FolderPath({ path }: { path: string[] }) {
  return (
    <p className="font-manrope text-[15px] font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
      {["Sources", ...path].map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-muted-foreground/60">›</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

function FolderDetail({ folder }: { folder: GuideFolder }) {
  const files = folder.subfolder_count
    ? `${folder.file_count} file di ${folder.subfolder_count} subfolder`
    : `${folder.file_count} file`;
  return (
    <p className="font-inter text-[13px] text-muted-foreground">
      {files} · diunggah oleh{folder.owner ? ` ${folder.owner}` : "mu"}
    </p>
  );
}

function FolderList({ folders, active, onPick }: { folders: GuideFolder[]; active: boolean; onPick: (t: string) => void }) {
  return (
    <ul className="space-y-2">
      {folders.map((f) => (
        <li key={`${label(f)}|${f.owner ?? ""}`}>
          <button
            type="button"
            disabled={!active}
            onClick={() => onPick(`Pakai folder ${label(f)}`)}
            className="group flex w-full items-center gap-3.5 rounded-lg border border-border bg-card px-4 py-3 text-left shadow-xs transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"
          >
            <MaterialIcon name="folder" size={22} fill className="text-primary-pressed dark:text-primary" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <FolderPath path={f.path} />
              <FolderDetail folder={f} />
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function NotThisFolder({ active, onPick }: { active: boolean; onPick: (t: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={!active}
      icon={<ArrowLeftRight />}
      className="text-[13px] text-muted-foreground hover:text-foreground"
      onClick={() => onPick("Bukan folder ini")}
    >
      Bukan folder ini
    </Button>
  );
}

export function FolderPart({ guide, active, onPick }: GuidePartProps) {
  const [picking, setPicking] = useState(false);

  if (guide.folder) {
    const f = guide.folder;
    return (
      <div className="space-y-3">
        <Panel padding="md" className="flex items-center gap-3.5 px-5">
          <MaterialIcon name="folder" size={24} fill className="text-primary-pressed dark:text-primary" />
          <div className="min-w-0 space-y-0.5">
            <FolderPath path={f.path} />
            <FolderDetail folder={f} />
          </div>
        </Panel>
        {/* MS-1182: with a question, answering it confirms the folder; ClarifyPart shows its chips and this button. */}
        {!guide.question && (
          <div className="flex flex-wrap items-center gap-2">
            <ChoiceChip disabled={!active} onClick={() => onPick(`Ya, pakai folder ${label(f)}`)}>
              Ya, ini foldernya
            </ChoiceChip>
            <NotThisFolder active={active} onPick={onPick} />
          </div>
        )}
      </div>
    );
  }

  if (guide.missing_source) {
    const own = guide.folders ?? [];
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {own.length > 0 && (
            <ChoiceChip disabled={!active} aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
              <MaterialIcon name="folder_open" size={16} />
              Pilih folder
            </ChoiceChip>
          )}
          <ChoiceChip disabled={!active} onClick={() => onPick("Belum tahu")}>
            <MaterialIcon name="help" size={16} />
            Belum tahu
          </ChoiceChip>
        </div>
        {picking && <FolderList folders={own} active={active} onPick={onPick} />}
      </div>
    );
  }

  if (guide.folders?.length) return <FolderList folders={guide.folders} active={active} onPick={onPick} />;
  return null;
}
