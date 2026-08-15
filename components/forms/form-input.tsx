import type { ComponentProps } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";

interface FormInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Pick<ComponentProps<"input">, "type" | "autoComplete" | "autoFocus" | "disabled" | "placeholder"> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  className?: string;
}

/** FormField + Input in one call, for plain text/email/etc. fields. */
function FormInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, description, className, ...inputProps }: FormInputProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => <Input {...inputProps} {...field} />}
    />
  );
}

export { FormInput };
