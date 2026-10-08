"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormPasswordInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Pick<ComponentProps<"input">, "autoComplete" | "autoFocus" | "disabled" | "placeholder" | "aria-label"> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
}

/** FormField + password Input with a built-in show/hide toggle — each instance toggles independently. */
function FormPasswordInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, description, className, inputClassName, labelClassName, hintClassName, ...inputProps }: FormPasswordInputProps<TFieldValues, TName>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      labelClassName={labelClassName}
      hintClassName={hintClassName}
      render={(field) => (
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", inputClassName)}
            {...inputProps}
            {...field}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={inputProps.disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      )}
    />
  );
}

export { FormPasswordInput };
