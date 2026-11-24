"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormField } from "@/components/forms/form-field";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { pdfCollectionsQueries } from "@/services/pdf-collections/handler/pdf-collections.queries";
import type { GapAnalysisCorrectionRequest, GapAnalysisItem } from "@/services/gap-analysis/type/gap-analysis.type";
import {
  CORRECTABLE_STATUSES,
  CORRECTION_KINDS,
  correctionDefaults,
  correctionRequest,
  correctionSchema,
  documentValue,
  parseDocumentValue,
  type CorrectionValues,
} from "../_lib/correction-form";
import { rememberedDirection } from "../_lib/results";

/**
 * "AI got this wrong?" and "Decide the status" (MS-1115): what was wrong, the right status, a short
 * reason the team and the export see, and whether to remember it for the next checks.
 *
 * `onSave` resolves when the correction is stored (the dialog closes) and rejects after its own
 * toast (the dialog stays open with what was typed). `onClosed` is where focus goes afterwards: the
 * button that opened the dialog may be gone by then (a decided item has no "Decide the status").
 */
export function CorrectionDialog({
  open,
  onOpenChange,
  item,
  runDocumentIds,
  canRemember,
  onSave,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GapAnalysisItem;
  /** The run's own documents, offered first when picking the one the AI missed. */
  runDocumentIds: string[];
  /** False for a run stored before analyses had rule sets: there is nothing to remember it in. */
  canRemember: boolean;
  onSave: (body: GapAnalysisCorrectionRequest) => Promise<void>;
  onClosed: () => void;
}) {
  const formId = useId();
  const form = useForm<CorrectionValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: correctionDefaults(item),
  });
  const saving = form.formState.isSubmitting;
  const [kind, documentPicked, section, reason, remember] = useWatch({
    control: form.control,
    name: ["kind", "document", "section", "reason", "remember"],
  });

  // Each opening starts from the item as it is then (its correction, if it has one). Only opening
  // resets: a save replaces `item` while the dialog is still closing, and must not blank the form or
  // change the title under the user.
  const [deciding, setDeciding] = useState(item.status === "needs_decision");
  const wasOpen = useRef(false);
  const saved = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      form.reset(correctionDefaults(item));
      setDeciding(item.status === "needs_decision");
    }
    wasOpen.current = open;
  }, [open, item, form]);

  const submit = form.handleSubmit(async (values) => {
    if (values.kind === "wrong_status" && values.status === item.ai_status) {
      form.setError("status", { message: "That is the AI's status already. Choose the one that is right" }, { shouldFocus: true });
      return;
    }
    try {
      await onSave(correctionRequest(values));
      saved.current = true;
      onOpenChange(false);
    } catch {
      // The toast said what failed; keep the dialog open for another try.
    }
  });

  const direction = reason.trim()
    ? rememberedDirection(item, { kind, reason, fileName: parseDocumentValue(documentPicked)?.file_name, section })
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent
        className="sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          // Cancel returns focus to the opening button as usual; after a save it may be gone.
          if (!saved.current) return;
          saved.current = false;
          event.preventDefault();
          onClosed();
        }}
      >
        <DialogHeader>
          <DialogTitle>{deciding ? "Decide the status" : "Correct the AI's status"}</DialogTitle>
          <DialogDescription>
            The status you choose is used in the results and the export. The AI&apos;s status stays recorded next to it.
          </DialogDescription>
        </DialogHeader>

        <FormFieldset busy={saving} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="kind"
            label="What was wrong?"
            render={({ value, onChange, ref, id, ...aria }) => (
              <RadioGroup
                ref={ref}
                id={id}
                {...aria}
                aria-label="What was wrong?"
                value={value}
                onValueChange={onChange}
                className="gap-2"
              >
                {CORRECTION_KINDS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors has-[[data-slot=radio-group-item]:focus-visible]:ring-2 has-[[data-slot=radio-group-item]:focus-visible]:ring-ring",
                      value === option.value ? "border-primary bg-primary/[0.04]" : "hover:bg-muted/40",
                    )}
                  >
                    <RadioGroupItem value={option.value} aria-label={option.label} className="mt-0.5 size-3.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />

          <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
            {kind === "missed_document" && <MissedDocumentFields form={form} runDocumentIds={runDocumentIds} />}

            {kind !== "not_applicable" && (
              <FormField
                control={form.control}
                name="status"
                label="The right status"
                render={({ value, onChange, ref, id, ...aria }) => (
                  <ToggleGroup
                    ref={ref}
                    id={id}
                    {...aria}
                    aria-label="The right status"
                    type="single"
                    variant="outline"
                    value={value}
                    onValueChange={(next) => next && onChange(next)}
                    className="flex-wrap"
                  >
                    {CORRECTABLE_STATUSES.map((status) => (
                      <ToggleGroupItem key={status.value} value={status.value} className="px-3">
                        {status.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              label="Short reason"
              description="Your team and the export show it next to the status."
              render={(field) => (
                <Textarea {...field} rows={3} placeholder="The access review is recorded in the HR folder, Section 2." />
              )}
            />
          </form>

          <label
            className={cn(
              "flex items-start gap-2.5 text-sm",
              canRemember ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground",
            )}
          >
            <Checkbox
              checked={remember}
              disabled={!canRemember}
              onCheckedChange={(checked) => form.setValue("remember", checked === true)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="font-semibold">Remember for next checks</span>
              <span className="block text-xs text-muted-foreground">
                {canRemember
                  ? direction
                    ? `Adds to this analysis's directions: "${direction}"`
                    : "Adds your reason to this analysis's directions, so the AI uses it next time."
                  : "This result was stored before analyses kept directions, so there is nowhere to remember it."}
              </span>
            </span>
          </label>

          <DialogFooter className="items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Corrections are also counted to measure AI accuracy.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form={formId} loading={saving} loadingText="Saving…">
                Save correction
              </Button>
            </div>
          </DialogFooter>
        </FormFieldset>
      </DialogContent>
    </Dialog>
  );
}

/** The document the AI missed, from the user's documents (this run's first), and the section. */
function MissedDocumentFields({
  form,
  runDocumentIds,
}: {
  form: ReturnType<typeof useForm<CorrectionValues>>;
  runDocumentIds: string[];
}) {
  const collectionsQuery = useQuery(pdfCollectionsQueries.list());
  const options = useMemo(() => {
    const rank = (id: string) => (runDocumentIds.includes(id) ? 0 : 1);
    return [...(collectionsQuery.data ?? [])]
      .sort((a, b) => rank(a.collection_id) - rank(b.collection_id))
      .flatMap((collection) =>
        collection.file_names.map((fileName) => ({
          value: documentValue(collection.collection_id, fileName),
          label: collection.title && collection.title !== fileName ? `${fileName} · ${collection.title}` : fileName,
        })),
      );
  }, [collectionsQuery.data, runDocumentIds]);

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
      <FormField
        control={form.control}
        name="document"
        label="Document the AI missed"
        render={({ value, onChange, ref, id, ...aria }) => (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger ref={ref} id={id} {...aria} className="w-full min-w-0">
              <SelectValue
                placeholder={
                  collectionsQuery.isPending
                    ? "Loading documents…"
                    : collectionsQuery.isError
                      ? "Couldn't load your documents"
                      : "Choose a document"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FormField
        control={form.control}
        name="section"
        label="Section (optional)"
        render={(field) => <Input {...field} placeholder="Section 2" />}
      />
    </div>
  );
}
