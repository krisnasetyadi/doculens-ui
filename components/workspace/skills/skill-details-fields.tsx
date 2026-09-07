"use client";

import type { Control } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
        render={(field) => (
          <Input
            {...field}
            id={field.name}
            placeholder="e.g. Contract review"
            disabled={disabled}
            autoFocus={autoFocus}
            className="rounded-lg border-border/70 bg-card/50"
          />
        )}
      />
      <FormField
        control={control}
        name="description"
        label="Description (optional)"
        render={(field) => (
          <Textarea
            {...field}
            id={field.name}
            placeholder="What does this skill help with?"
            disabled={disabled}
            rows={2}
            className="field-sizing-fixed min-h-20 max-h-36 resize-y rounded-lg border-border/70 bg-card/50"
          />
        )}
      />
    </>
  );
}
