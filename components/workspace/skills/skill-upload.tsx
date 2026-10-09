"use client";

import { useRef, useState } from "react";
import { ArrowLeft, FileText, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CARD_CLASS,
  SECTION_TITLE_CLASS,
  SETTINGS_DESC_CLASS,
  SETTINGS_TITLE_CLASS,
} from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillAccess } from "./skill-access";
import { parseSkillMarkdown, validateSkillFile } from "./skill-file";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { IconTile } from "@/components/icon-tile";
import { Notice } from "@/components/notice";
import { panelVariants } from "@/components/panel";

interface SkillUploadProps {
  isAdmin: boolean;
  onBack: () => void;
  onUploaded: (skill: Skill) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SkillUpload({ isAdmin, onBack, onUploaded }: SkillUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ReturnType<typeof parseSkillMarkdown> | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [scope, setScope] = useState<SkillScope>("personal");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = reading || saving;

  function openPicker() {
    if (busy) return;
    setFileError(null);
    inputRef.current?.click();
  }

  async function readFile(files: FileList | null) {
    if (!files?.length || busy) return;
    setFileError(null);
    if (files.length !== 1) {
      setFileError("Choose one Markdown file at a time.");
      return;
    }
    const file = files[0];
    try {
      validateSkillFile(file);
    } catch {
      setFileError("Upload a Markdown file under 256 KB.");
      return;
    }
    setReading(true);
    setDraft(null);
    try {
      const parsed = parseSkillMarkdown(await file.text(), file.name);
      setDraft(parsed);
      setFileName(file.name);
      setFileSize(file.size);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read this file. Please try again.");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Name, description, and slash command all come straight from the file's
  // own frontmatter (see parseSkillMarkdown) — nothing to type or rewrite
  // here. They stay editable afterwards from the skill's own detail view.
  async function upload() {
    if (!draft || busy) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const skill = await SkillApi.create({ ...draft, scope: isAdmin ? scope : "personal" });
      onUploaded(skill);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not upload this skill. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); void upload(); }}>
      <FormFieldset busy={busy} className="block space-y-5">
        <div className="space-y-3">
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy} className="-ml-3">
            <ArrowLeft className="h-4 w-4" /> Skills
          </Button>
          <div>
            <h2 className={SETTINGS_TITLE_CLASS}>Add a skill</h2>
            <p className={SETTINGS_DESC_CLASS}>Upload a Markdown file with reusable instructions.</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".md,text/markdown"
          aria-label="Choose a skill Markdown file"
          aria-invalid={!!fileError}
          className="sr-only"
          tabIndex={-1}
          disabled={busy}
          onChange={(event) => void readFile(event.target.files)}
        />

        <div className="space-y-1.5">
          {draft ? (
            <div className={cn(CARD_CLASS, "px-4 py-3")}>
              <div className="flex items-center gap-3">
                <IconTile><FileText className="size-4" /></IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{draft.name}</span>
                  <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                    <code className="font-mono">{draft.slash_command}</code>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{fileName}</span>
                  </span>
                </span>
                <Button type="button" variant="link" disabled={busy} onClick={openPicker} className="shrink-0">Change</Button>
              </div>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview instructions</summary>
                <pre className={cn(panelVariants({ padding: "sm" }), "mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap break-words font-mono leading-6")}>{draft.instruction}</pre>
              </details>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={openPicker}
              aria-describedby={fileError ? "skill-file-error" : undefined}
              onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files); }}
              className={`flex w-full flex-col items-center rounded-xl border border-dashed px-5 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                fileError
                  ? "border-destructive/30 bg-danger-soft"
                  : dragging
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
              }`}
            >
              <IconTile size="lg" tone={fileError ? "danger" : "muted"} className="mb-2.5">
                {reading ? <Loader2 className="size-[18px] animate-spin" /> : <Upload className="size-[18px]" />}
              </IconTile>
              <span className="font-manrope text-[13px] font-bold text-foreground">{reading ? "Reading your file…" : "Click to upload or drag and drop"}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">Markdown (.md) · Max 256 KB</span>
            </button>
          )}
          {fileError && (
            <Notice id="skill-file-error" role="alert" tone="error">{fileError}</Notice>
          )}
        </div>

        <section className="space-y-3" aria-label="Skill access">
          <h3 className={SECTION_TITLE_CLASS}>Visibility</h3>
          {isAdmin ? <SkillAccess value={scope} onChange={setScope} disabled={saving} /> : (
            <div className={cn(CARD_CLASS, "flex items-start gap-3 px-4 py-2.5")}>
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold">Private</p>
                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">Only you can use this skill.</p>
              </div>
            </div>
          )}
        </section>

        <div className="space-y-3">
          {submitError && <Notice role="alert" tone="error">{submitError}</Notice>}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>Cancel</Button>
            <Button type="submit" loading={saving} loadingText="Adding…" disabled={!draft || busy}>
              Add skill
            </Button>
          </div>
        </div>
      </FormFieldset>
    </form>
  );
}
