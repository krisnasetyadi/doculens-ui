"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FileSpreadsheet, FolderOpen, Play, RotateCcw, Sparkles } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { SearchableSelect } from "@/components/fields/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CAPTION_CLASS, SECTION_TITLE_CLASS } from "@/components/workspace/settings-ui";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { gapAnalysisQueries } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { ReusableAnalysis } from "@/services/gap-analysis/type/gap-analysis.type";
import type { ContinuedAnalysis } from "@/stores/analysis-run-store";
import type { AnalysisSetup as Setup, SetupRun } from "../../hooks/use-analysis-setup";
import { folderKey, GOAL_EXAMPLES, reusableLabel } from "../../lib/setup";
import { DraftPanel } from "./draft-panel";

const GOAL_FORM_ID = "analysis-goal-form";

const goalSchema = z.object({
  goal: z.string().trim().min(3, "Describe what you want to check").max(500, "Keep it under 500 characters"),
});
type GoalValues = z.infer<typeof goalSchema>;

/**
 * The New analysis drawer's form (MS-1114): what to check, which rule file and documents, and the
 * requirement list to approve, beside it on a wide screen. `onStart` receives the run to start.
 */
export function AnalysisSetup({
  setup,
  continued,
  notice,
  onCancel,
  onStart,
}: {
  setup: Setup;
  /** "Check all N requirements" from a result: that analysis's rule set, reused. */
  continued: ContinuedAnalysis | null;
  /** A failed run's message, above the form. */
  notice?: ReactNode;
  onCancel: () => void;
  onStart: (run: SetupRun) => void;
}) {
  const analysesQuery = useQuery(gapAnalysisQueries.analyses());
  const analyses = analysesQuery.data ?? [];

  // "Check all N requirements" opens on that analysis's rule set, once.
  const continuedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (!continued || continuedFrom.current === continued.analysisId) return;
    const analysis = analyses.find((a) => a.analysis_id === continued.analysisId);
    if (!analysis) return;
    continuedFrom.current = continued.analysisId;
    void setup.suggest(analysis.goal || analysis.framework_name, analysis);
  }, [continued, analyses, setup]);

  const start = () => {
    const run = setup.runRequest();
    if (run) onStart(run);
  };

  return (
    <>
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 sm:px-9">
        {notice}
        <div className="grid gap-x-8 gap-y-5 py-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <GoalStep setup={setup} analyses={analyses} />
            {setup.stage !== "goal" && <ScopeStep setup={setup} />}
          </div>
          <div className="min-h-0 min-w-0 lg:border-l lg:border-border lg:pl-8">
            {setup.reused ? (
              <ReusedRuleSet analysis={setup.reused} />
            ) : (
              <DraftPanel
                draft={setup.draft}
                loading={setup.drafting}
                on={setup.on}
                onToggle={setup.toggleRequirement}
                onSetAll={setup.setAllRequirements}
                onRemap={(mapping) => void setup.loadDraft(mapping)}
              />
            )}
          </div>
        </div>
      </div>
      <Footer setup={setup} onCancel={onCancel} onStart={start} />
    </>
  );
}

function Step({ number, title, done, children }: { number: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className={cn(SECTION_TITLE_CLASS, "flex items-center gap-2 text-xs")}>
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full font-manrope text-[10.78px] font-extrabold text-white",
            done ? "bg-success" : "bg-primary",
          )}
        >
          {number}
        </span>
        {title}
      </h3>
      <div className="flex flex-col gap-2.5 pl-7">{children}</div>
    </section>
  );
}

/** Decision 1: what to check. Once answered it reads as one line, with Change to go back. */
function GoalStep({ setup, analyses }: { setup: Setup; analyses: ReusableAnalysis[] }) {
  const form = useForm<GoalValues>({ resolver: zodResolver(goalSchema), defaultValues: { goal: setup.goal } });
  const submit = form.handleSubmit(({ goal }) => setup.suggest(goal.trim()));

  if (setup.stage !== "goal") {
    return (
      <Step number={1} title="What do you want to check?" done>
        <p className="text-xs text-foreground">{setup.reused ? `Check again: ${setup.reused.framework_name}` : setup.goal}</p>
        <Button variant="outline" size="sm" className="self-start" onClick={setup.backToGoal} icon={<RotateCcw className="size-3.5" />}>
          Change
        </Button>
      </Step>
    );
  }

  return (
    <Step number={1} title="What do you want to check?">
      <form id={GOAL_FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="goal"
          render={(field) => (
            <Textarea
              {...field}
              aria-label="What do you want to check?"
              rows={3}
              placeholder="Are our documents ready for the ISO 27001 internal audit?"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          )}
        />
      </form>
      <div className="flex flex-wrap gap-1.5" aria-label="Examples">
        {GOAL_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => form.setValue("goal", example, { shouldValidate: form.formState.isSubmitted })}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-left text-[10.78px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {example}
          </button>
        ))}
      </div>
      <p className={CAPTION_CLASS}>The AI finds the rule file and the folders to check. You can change both.</p>

      {analyses.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
          <p className={cn(CAPTION_CLASS, "font-semibold text-foreground")}>Or check again with a rule set you already have</p>
          {analyses.slice(0, 4).map((analysis) => (
            <button
              key={analysis.analysis_id}
              type="button"
              disabled={setup.suggesting}
              onClick={() => void setup.suggest(analysis.goal || analysis.framework_name, analysis)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <RotateCcw aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {reusableLabel(analysis, analysis.last_run_at ? formatDate(analysis.last_run_at) : null)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Step>
  );
}

/** Decision 2: the documents. The rule file the AI found sits on top, and can be swapped. */
function ScopeStep({ setup }: { setup: Setup }) {
  const suggestion = setup.suggestion!;
  return (
    <>
      {!setup.reused && (
        <Step number={2} title="Rule file">
          {setup.ruleFile ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/[0.04] px-3 py-2.5">
              <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="min-w-0 text-xs">
                <p>
                  AI will compare your documents with <b className="break-words">{setup.ruleFile.file_name}</b>
                </p>
                {suggestion.rule_file_why && setup.ruleFile.collection_id === suggestion.rule_file?.collection_id && (
                  <p className={CAPTION_CLASS}>{suggestion.rule_file_why}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No rule file was found for this. Pick the document that lists the requirements, such as an SoA.
            </p>
          )}
          <SearchableSelect
            size="sm"
            items={suggestion.rule_files.map((f) => ({ value: f.collection_id, label: `${f.flagged ? "★ " : ""}${f.file_name}` }))}
            value={setup.ruleFile?.collection_id ?? null}
            onValueChange={(id) => id && setup.chooseRuleFile(id)}
            placeholder={setup.ruleFile ? "Use another file" : "Choose the rule file"}
            searchPlaceholder="Search your documents…"
            icon={<FileSpreadsheet className="size-3.5 text-muted-foreground" />}
          />
        </Step>
      )}

      <Step number={setup.reused ? 2 : 3} title="Which documents?">
        {suggestion.folders_why && <p className={CAPTION_CLASS}>{suggestion.folders_why}</p>}
        {suggestion.folders.length === 0 ? (
          <p className="text-xs text-muted-foreground">You have no documents to check yet. Upload them in Sources first.</p>
        ) : (
          <ul className="flex flex-col rounded-lg border border-border">
            {suggestion.folders.map((folder) => {
              const key = folderKey(folder);
              const checked = setup.folders.includes(key);
              return (
                <li key={key || "loose"} className="border-t border-border/60 first:border-t-0">
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/40">
                    <Checkbox checked={checked} onCheckedChange={() => setup.toggleFolder(key)} />
                    <FolderOpen aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{folder.path.join(" / ") || folder.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{folder.document_count}</span>
                    {folder.suggested && <Badge variant="info">Suggested</Badge>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className={CAPTION_CLASS}>
          {setup.documentIds.length === 0
            ? "Pick at least one folder"
            : `${setup.documentIds.length} ${setup.documentIds.length === 1 ? "document" : "documents"} will be checked`}
        </p>
      </Step>
    </>
  );
}

function ReusedRuleSet({ analysis }: { analysis: ReusableAnalysis }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3">
      <p className={cn(SECTION_TITLE_CLASS, "text-xs")}>Rule set: {analysis.framework_name}</p>
      <p className={CAPTION_CLASS}>
        {analysis.requirement_count} requirements, as approved before. Each result compares with the last check, so you see what
        moved.
      </p>
    </div>
  );
}

/** One primary action per step, so the user is never more than four decisions from the first check. */
function Footer({ setup, onCancel, onStart }: { setup: Setup; onCancel: () => void; onStart: () => void }) {
  const canStart = !!setup.runRequest();
  let primary: ReactNode;
  let back: ReactNode = (
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  );
  if (setup.stage === "goal") {
    primary = (
      <Button type="submit" form={GOAL_FORM_ID} loading={setup.suggesting} loadingText="Looking…">
        Next
        <ArrowRight className="size-3.5" />
      </Button>
    );
  } else if (setup.stage === "scope" && !setup.reused) {
    back = (
      <Button type="button" variant="outline" onClick={setup.backToGoal} icon={<ArrowLeft className="size-3.5" />}>
        Back
      </Button>
    );
    primary = (
      <Button
        onClick={() => void setup.loadDraft()}
        loading={setup.drafting}
        loadingText="Reading the requirements…"
        disabled={!setup.ruleFile || setup.documentIds.length === 0}
      >
        Review requirements
        <ArrowRight className="size-3.5" />
      </Button>
    );
  } else {
    back = (
      <Button
        type="button"
        variant="outline"
        onClick={setup.reused ? setup.backToGoal : setup.backToScope}
        icon={<ArrowLeft className="size-3.5" />}
      >
        Back
      </Button>
    );
    primary = (
      <Button onClick={onStart} disabled={!canStart} icon={<Play className="size-3.5" />}>
        {setup.reused ? "Start check" : "Approve and start"}
      </Button>
    );
  }
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-9 [&>button]:flex-1 sm:[&>button]:flex-none">
      {back}
      {primary}
    </div>
  );
}
