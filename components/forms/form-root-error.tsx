import { useEffect } from "react";
import { useFormState, type FieldValues, type UseFormReturn } from "react-hook-form";

import { FormInlineError } from "@/components/forms/form-inline-error";

/**
 * The server's refusal of the form as a whole (not of one field), set with
 * `form.setError("root", { message })`. Render it once, directly above the submit button.
 * Like a field message it goes away once the user changes the input (and on the next submit),
 * never on a timer. A refusal about one field goes on that field instead
 * (`form.setError(name, ...)`), and a failure that is not about the input is a toast.
 */
function FormRootError<TFieldValues extends FieldValues>({
  form,
  className,
}: {
  form: UseFormReturn<TFieldValues>;
  className?: string;
}) {
  const { errors } = useFormState({ control: form.control });
  const message = errors.root?.message;

  useEffect(() => {
    const subscription = form.watch(() => {
      if (form.formState.errors.root) form.clearErrors("root");
    });
    return () => subscription.unsubscribe();
  }, [form]);

  if (!message) return null;
  return <FormInlineError message={message} className={className} />;
}

export { FormRootError };
