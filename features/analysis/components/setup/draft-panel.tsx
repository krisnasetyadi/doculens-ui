"use client";

import { useEffect, useMemo, useState } from "react";
import { ListChecks, MapPin, Search, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CAPTION_CLASS, SECTION_TITLE_CLASS } from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import type { SetupDraft, TableMapping } from "@/services/gap-analysis/type/gap-analysis.type";
import { mappingNote, RESULT_STATUS_LABELS } from "../../lib/setup";

const NONE = "__none__";

/**
 * "This is what the AI will check" (MS-1114): the drafted requirement list, each with where it
 * came from and a switch, and the statuses the check will give. A spreadsheet's column mapping sits
 * on top, so the user can see which columns were read and change them.
 */
export function DraftPanel({
  draft,
  loading,
  on,
  onToggle,
  onSetAll,
  onRemap,
}: {
  draft: SetupDraft | null;
  loading: boolean;
  on: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onSetAll: (all: boolean) => void;
  onRemap: (mapping: TableMapping) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!draft || !q) return draft?.requirements ?? [];
    return draft.requirements.filter((r) => `${r.code ?? ""} ${r.label}`.toLowerCase().includes(q));
  }, [draft, query]);

  if (loading) return <DraftSkeleton />;
  if (!draft) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 text-center">
        <ListChecks aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className={cn(SECTION_TITLE_CLASS, "text-xs")}>The requirements to check appear here</p>
        <p className={CAPTION_CLASS}>Choose the rule file and folders, then review the list before the check starts.</p>
      </div>
    );
  }

  const total = draft.requirements.length;
  return (
    <section aria-labelledby="draft-title" className="flex min-h-0 flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h3 id="draft-title" className={cn(SECTION_TITLE_CLASS, "text-xs")}>
          This is what the AI will check
        </h3>
        <p className={CAPTION_CLASS}>
          {draft.kind === "table" ? `Read row by row from ${draft.file_name}.` : `Listed by the AI from ${draft.file_name}.`} Switch off
          what you don&apos;t need. Saved as this analysis&apos;s rule set, so later checks reuse it.
        </p>
      </header>

      {draft.kind === "table" && <MappingRow draft={draft} onRemap={onRemap} />}

      {total === 0 ? (
        <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-[11.76px] text-muted-foreground">
          No requirements were found. {draft.kind === "table" ? "Choose the columns that hold them above." : "Try another rule file."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">
              {on.size} of {total} on
            </Badge>
            <div className="relative min-w-[160px] flex-1">
              <Search aria-hidden="true" className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search requirements"
                aria-label="Search requirements"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => onSetAll(on.size < total)}>
              {on.size < total ? "Switch all on" : "Switch all off"}
            </Button>
          </div>

          <ul className="custom-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
            {shown.map((r) => {
              const checked = on.has(r.key);
              return (
                <li key={r.key} className={cn("flex items-start gap-3 border-t border-border/60 px-3 py-2.5 first:border-t-0", !checked && "opacity-55")}>
                  <Switch
                    checked={checked}
                    onCheckedChange={() => onToggle(r.key)}
                    aria-label={`Check ${r.code ? `${r.code} ` : ""}${r.label}`}
                    className="mt-0.5"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-xs text-foreground">
                      {r.code && <span className="mr-1.5 font-semibold text-muted-foreground">{r.code}</span>}
                      {r.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.source?.label && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-px text-[10.78px] font-semibold text-info-ink">
                          <MapPin aria-hidden="true" className="size-3" />
                          {r.source.label}
                        </span>
                      )}
                      {r.applicable === false && (
                        <span className="text-[10.78px] text-muted-foreground">Marked not applicable in the rule file</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted-foreground">No requirement matches “{query}”.</li>}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 px-3 py-2.5">
        <p className={cn(CAPTION_CLASS, "font-semibold text-foreground")}>Each requirement gets one of these statuses</p>
        <div className="flex flex-wrap gap-1.5">
          {RESULT_STATUS_LABELS.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Which sheet, header row and columns were read. Changing one re-reads the file with them. */
function MappingRow({ draft, onRemap }: { draft: SetupDraft; onRemap: (mapping: TableMapping) => void }) {
  const initial: TableMapping = draft.mapping ?? {
    sheet: draft.sheets[0]?.name ?? "",
    header_row: draft.sheets[0]?.rows[0]?.row ?? 1,
    code: null,
    name: "",
    applicable: null,
  };
  const [mapping, setMapping] = useState<TableMapping>(initial);
  // A new draft (another file, or re-read columns) starts from what it was read with.
  useEffect(() => setMapping(initial), [draft]);

  const sheet = draft.sheets.find((s) => s.name === mapping.sheet) ?? draft.sheets[0];
  const header = sheet?.rows.find((r) => r.row === mapping.header_row);
  const columnLabel = (letter: string) => {
    const index = sheet?.columns.indexOf(letter) ?? -1;
    const title = index >= 0 ? header?.cells[index] : "";
    return title ? `${letter} · ${title}` : letter;
  };
  const changed = JSON.stringify(mapping) !== JSON.stringify(initial);
  const note = mappingNote(draft);

  const column = (role: "code" | "name" | "applicable", label: string, optional: boolean) => (
    <label className="flex min-w-[120px] flex-1 flex-col gap-1">
      <span className={CAPTION_CLASS}>{label}</span>
      <Select
        value={mapping[role] ?? NONE}
        onValueChange={(value) => setMapping((m) => ({ ...m, [role]: value === NONE ? null : value }))}
      >
        <SelectTrigger size="sm" className="h-8 w-full min-w-0 text-xs">
          <SelectValue placeholder="Choose a column" />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>None</SelectItem>}
          {sheet?.columns.map((letter) => (
            <SelectItem key={letter} value={letter}>
              {columnLabel(letter)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Table2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
        Columns read
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className={CAPTION_CLASS}>Sheet</span>
          <Select
            value={mapping.sheet}
            onValueChange={(name) => {
              const next = draft.sheets.find((s) => s.name === name);
              setMapping({ sheet: name, header_row: next?.rows[0]?.row ?? 1, code: null, name: "", applicable: null });
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-full min-w-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {draft.sheets.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name} ({s.row_count} rows)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex w-[110px] flex-col gap-1">
          <span className={CAPTION_CLASS}>Header row</span>
          <Select
            value={String(mapping.header_row)}
            onValueChange={(row) => setMapping((m) => ({ ...m, header_row: Number(row) }))}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sheet?.rows.map((r) => (
                <SelectItem key={r.row} value={String(r.row)}>
                  Row {r.row}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {column("code", "Number", true)}
        {column("name", "Name", false)}
        {column("applicable", "Applicable", true)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {note && <p className={CAPTION_CLASS}>{note}</p>}
        {changed && (
          <Button size="sm" variant="outline" onClick={() => mapping.name && onRemap(mapping)} disabled={!mapping.name}>
            Read with these columns
          </Button>
        )}
      </div>
    </div>
  );
}

function DraftSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">Reading the requirements…</span>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
