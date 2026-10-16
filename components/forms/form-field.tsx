import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { FieldHint } from "@/components/forms/field-hint";
import { Label } from "@/components/ui/label";

/** What `render` receives: react-hook-form's field props plus the ids that tie the control to its
 * label and to the line under it. Spread all of it onto the focusable control; `ref` is how a failed
 * submit moves focus to the first invalid field. */
type FormFieldControlProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = ControllerRenderProps<TFieldValues, TName> & {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  className?: string;
  render: (field: FormFieldControlProps<TFieldValues, TName>) => ReactNode;
}

/**
 * Generic react-hook-form adapter (ported from the boilerplate repo): one
 * FormField renders a label, the field itself via `render`, and the zod error
 * from fieldState, so call sites need no per-field FormItem/FormControl/FormMessage stack.
 * Validation lives entirely in the zod schema passed to
 * useForm({ resolver: zodResolver(schema) }).
 *
 * The error shows after the first submit and clears as soon as the field is valid again
 * (react-hook-form's default onSubmit / reValidate onChange modes), under the field, linked to it
 * with aria-describedby. A server message about one field goes through `form.setError(name, ...)`
 * and shows here the same way.
 */
function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, description, className, render }: FormFieldProps<TFieldValues, TName>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const messageId = `${id}-message`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn("grid gap-2", className)}>
          {label && <Label htmlFor={id}>{label}</Label>}
          {render({
            ...field,
            id,
            "aria-invalid": fieldState.invalid || undefined,
            "aria-describedby": fieldState.error ? messageId : description ? hintId : undefined,
          })}
          {description && !fieldState.error && (
            <FieldHint id={hintId}>{description}</FieldHint>
          )}
          {fieldState.error && (
            <FieldHint id={messageId} tone="error">{fieldState.error.message}</FieldHint>
          )}
        </div>
      )}
    />
  );
}

export { FormField };
export type { FormFieldControlProps };
