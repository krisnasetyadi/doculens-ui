import type * as React from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  className?: string;
  render: (
    field: ControllerRenderProps<TFieldValues, TName> & { "aria-invalid"?: boolean }
  ) => React.ReactNode;
}

/**
 * Generic react-hook-form adapter (ported from the boilerplate repo): one
 * FormField renders a label, the field itself via `render`, and the zod error
 * from fieldState — no per-field FormItem/FormControl/FormMessage stack needed
 * at call sites. Validation lives entirely in the zod schema passed to
 * useForm({ resolver: zodResolver(schema) }).
 */
function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, description, className, render }: FormFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn("grid gap-2", className)}>
          {label && <Label htmlFor={name}>{label}</Label>}
          {render({ ...field, "aria-invalid": fieldState.invalid || undefined })}
          {description && !fieldState.error && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {fieldState.error && (
            <p className="text-sm text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

export { FormField };
