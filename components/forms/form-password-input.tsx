"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/icon-button";

interface FormPasswordInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Pick<ComponentProps<"input">, "autoComplete" | "autoFocus" | "disabled" | "placeholder" | "aria-label"> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  className?: string;
}

/** FormField + password Input with a built-in show/hide toggle — each instance toggles independently. */
function FormPasswordInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, description, className, ...inputProps }: FormPasswordInputProps<TFieldValues, TName>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className="pr-10"
            {...inputProps}
            {...field}
          />
          <IconButton
            size="sm"
            type="button"
            label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            disabled={inputProps.disabled}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </IconButton>
        </div>
      )}
    />
  );
}

export { FormPasswordInput };
