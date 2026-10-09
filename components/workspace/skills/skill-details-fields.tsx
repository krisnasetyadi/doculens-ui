"use client";

import type { Control } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import type { SkillDetailsValues } from "./skill-details-schema";

interface SkillDetailsFieldsProps {
  control: Control<SkillDetailsValues>;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function SkillDetailsFields({ control, disabled, autoFocus }: SkillDetailsFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        label="Name"
        labelClassName={LABEL_CLASS}
        hintClassName="text-[11px]"
        render={(field) => (
          <Input
            {...field}
            id={field.name}
            placeholder="e.g. Contract review"
            disabled={disabled}
            autoFocus={autoFocus}
            className={INPUT_CLASS}
          />
        )}
      />
      <FormField
        control={control}
        name="description"
        label="Description (optional)"
        labelClassName={LABEL_CLASS}
        hintClassName="text-[11px]"
        render={(field) => (
          <Textarea
            {...field}
            id={field.name}
            placeholder="What does this skill help with?"
            disabled={disabled}
            rows={2}
            className={cn(INPUT_CLASS, "field-sizing-fixed h-auto min-h-20 max-h-36 resize-y py-2.5 leading-relaxed")}
          />
        )}
      />
    </>
  );
}
