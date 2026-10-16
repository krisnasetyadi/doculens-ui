"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FileText, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CARD_CLASS,
  SECTION_TITLE_CLASS,
  SETTINGS_DESC_CLASS,
  SETTINGS_TITLE_CLASS,
} from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import { useToast, errorToast } from "@/hooks/use-toast";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillAccess } from "./skill-access";
import { parseSkillMarkdown, validateSkillFile, type ParsedSkillMarkdown } from "./skill-file";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { IconTile } from "@/components/icon-tile";
import { FormField } from "@/components/forms/form-field";
import { panelVariants } from "@/components/panel";

/** What the picker holds once a file was chosen: the parsed skill, or why that file cannot be used.
 * The reason is only shown on submit, like every other field message. */
interface SkillFileChoice {
  name: string;
  draft: ParsedSkillMarkdown | null;
  problem: string | null;
}

const skillUploadSchema = z.object({
  file: z.custom<SkillFileChoice | null>().superRefine((choice, ctx) => {
    if (!choice) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a Markdown skill file" });
    else if (choice.problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: choice.problem });
  }),
  scope: z.custom<SkillScope>(),
});
type SkillUploadValues = z.infer<typeof skillUploadSchema>;

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
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();
  const form = useForm<SkillUploadValues>({
    resolver: zodResolver(skillUploadSchema),
    defaultValues: { file: null, scope: "personal" },
  });
  // Both read during render, so react-hook-form re-renders on submit and `isSubmitted` is current
  // when a file is chosen afterwards.
  const { isSubmitting: saving, isSubmitted } = form.formState;
  const busy = reading || saving;

  function openPicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  /** Reads the chosen file into the form. Whether it can be used is kept with it and, like every
   * other field, only shown on submit (and re-checked on each new choice after that). */
  async function readFile(files: FileList | null) {
    if (!files?.length || busy) return;
    const choose = (choice: SkillFileChoice) =>
      form.setValue("file", choice, { shouldDirty: true, shouldValidate: isSubmitted });
    if (files.length !== 1) {
      choose({ name: `${files.length} files`, draft: null, problem: "Choose one Markdown file at a time" });
      return;
    }
    const file = files[0];
    try {
      validateSkillFile(file);
    } catch (err) {
      choose({ name: file.name, draft: null, problem: err instanceof Error ? err.message : "Choose a Markdown (.md) file" });
      return;
    }
    setReading(true);
    try {
      choose({ name: file.name, draft: parseSkillMarkdown(await file.text(), file.name), problem: null });
    } catch (err) {
      choose({ name: file.name, draft: null, problem: err instanceof Error ? err.message : "Could not read this file. Choose it again." });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Name, description, and slash command all come straight from the file's
  // own frontmatter (see parseSkillMarkdown) — nothing to type or rewrite
  // here. They stay editable afterwards from the skill's own detail view.
  const upload = form.handleSubmit(async ({ file, scope }) => {
    if (!file?.draft) return;
    try {
      const skill = await SkillApi.create({ ...file.draft, scope: isAdmin ? scope : "personal" });
      onUploaded(skill);
    } catch (err) {
      toast(errorToast("Couldn't upload the skill", err));
    }
  });

  return (
    <form noValidate onSubmit={upload}>
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
          className="sr-only"
          tabIndex={-1}
          disabled={busy}
          onChange={(event) => void readFile(event.target.files)}
        />

        <FormField
          control={form.control}
          name="file"
          className="gap-1.5"
          render={({ value: choice, ref, id, "aria-invalid": invalid, "aria-describedby": describedBy }) => choice ? (
            <div className={cn(CARD_CLASS, "px-4 py-3", invalid && "border-destructive/30 bg-danger-soft")}>
              <div className="flex items-center gap-3">
                <IconTile tone={invalid ? "danger" : undefined}><FileText className="size-4" /></IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{choice.draft?.name ?? choice.name}</span>
                  {choice.draft && (
                    <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                      <code className="font-mono">{choice.draft.slash_command}</code>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{choice.name}</span>
                    </span>
                  )}
                </span>
                <Button
                  ref={ref}
                  id={id}
                  type="button"
                  variant="link"
                  disabled={busy}
                  onClick={openPicker}
                  aria-label={`Change file, ${choice.name}`}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  className="shrink-0"
                >
                  {reading ? "Reading…" : "Change"}
                </Button>
              </div>
              {choice.draft && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview instructions</summary>
                  <pre className={cn(panelVariants({ padding: "sm" }), "mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap break-words font-mono leading-6")}>{choice.draft.instruction}</pre>
                </details>
              )}
            </div>
          ) : (
            <button
              ref={ref}
              id={id}
              type="button"
              disabled={busy}
              onClick={openPicker}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files); }}
              className={`flex w-full flex-col items-center rounded-xl border border-dashed px-5 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                invalid
                  ? "border-destructive/30 bg-danger-soft"
                  : dragging
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
              }`}
            >
              <IconTile size="lg" tone={invalid ? "danger" : "muted"} className="mb-2.5">
                {reading ? <Loader2 className="size-[18px] animate-spin" /> : <Upload className="size-[18px]" />}
              </IconTile>
              <span className="font-manrope text-[13px] font-bold text-foreground">{reading ? "Reading your file…" : "Click to upload or drag and drop"}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">Markdown (.md) · Max 256 KB</span>
            </button>
          )}
        />

        <section className="space-y-3" aria-label="Skill access">
          <h3 className={SECTION_TITLE_CLASS}>Visibility</h3>
          {isAdmin ? (
            <Controller
              control={form.control}
              name="scope"
              render={({ field }) => <SkillAccess value={field.value} onChange={field.onChange} disabled={saving} />}
            />
          ) : (
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
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>Cancel</Button>
            <Button type="submit" loading={saving} loadingText="Adding…">
              Add skill
            </Button>
          </div>
        </div>
      </FormFieldset>
    </form>
  );
}
