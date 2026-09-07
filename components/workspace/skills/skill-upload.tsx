"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, FileText, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillAccess } from "./skill-access";
import { SkillDetailsFields } from "./skill-details-fields";
import { skillDetailsSchema, type SkillDetailsValues } from "./skill-details-schema";
import { parseSkillMarkdown, validateSkillFile } from "./skill-file";

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
  const detailsForm = useForm<SkillDetailsValues>({
    resolver: zodResolver(skillDetailsSchema),
    defaultValues: { name: "", description: "" },
  });
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
      detailsForm.reset({ name: parsed.name, description: parsed.description });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read this file. Please try again.");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function upload(values: SkillDetailsValues) {
    if (!draft || busy) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const skill = await SkillApi.create({ ...draft, ...values, scope: isAdmin ? scope : "personal" });
      onUploaded(skill);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not upload this skill. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={detailsForm.handleSubmit(upload)} className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy} className="-ml-3 gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Skills
      </Button>
      <div>
        <h2 className="font-['Manrope'] text-xl font-extrabold">Add a skill</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Upload a Markdown file with reusable instructions for repeated workflows.</p>
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

      <div className="space-y-2">
        {draft ? (
          <div className="rounded-xl border border-border bg-card/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-primary"><FileText className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{fileName}</span>
                <span className="block text-xs text-muted-foreground">{formatFileSize(fileSize)}</span>
              </span>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={openPicker} className="shrink-0 text-primary hover:text-primary">Replace file</Button>
            </div>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview instructions</summary>
              <pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 font-mono leading-6">{draft.instruction}</pre>
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
            className={`flex w-full flex-col items-center rounded-xl border border-dashed px-5 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              fileError
                ? "border-destructive/40 bg-destructive/5"
                : dragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40 hover:bg-primary/[0.03]"
            }`}
          >
            <span aria-hidden="true" className={`mb-2.5 rounded-xl border p-2.5 ${fileError ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-border/60 bg-muted text-primary"}`}>
              {reading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </span>
            <span className="text-sm font-semibold text-foreground">{reading ? "Reading your file…" : "Click to upload or drag and drop"}</span>
            <span className="mt-1 text-xs text-muted-foreground">Markdown (.md) · Max 256 KB</span>
          </button>
        )}
        {fileError && (
          <p id="skill-file-error" role="alert" className="flex items-start gap-2 text-xs leading-5 text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{fileError}
          </p>
        )}
      </div>

      {draft && <SkillDetailsFields control={detailsForm.control} disabled={busy} />}
      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Slash command</span>
          <code className="max-w-full break-all rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{draft.slash_command}</code>
        </div>
      )}

      <section className="space-y-3" aria-label="Skill access">
        <h3 className="text-sm font-semibold">Who can use this skill?</h3>
        {isAdmin ? <SkillAccess value={scope} onChange={setScope} disabled={saving} /> : (
          <p className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" /> Only you. Your uploads stay private to your account.
          </p>
        )}
      </section>

      {submitError && <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{submitError}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>Cancel</Button>
        <Button
          type="submit"
          disabled={!draft || busy}
          className="gap-2 rounded-lg font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] disabled:translate-y-0 disabled:shadow-none"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Adding…" : "Add skill"}
        </Button>
      </div>
    </form>
  );
}
