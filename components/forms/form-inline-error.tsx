import { Notice } from "@/components/notice";

/**
 * The one inline message for a form: something the user typed was not acceptable, so it says so next
 * to the form and stays until they change the input. A failed or successful action is a toast instead.
 * Pass `id` when a field points at it with `aria-describedby`.
 */
export function FormInlineError({ message, id, className }: { message: string; id?: string; className?: string }) {
  return (
    <Notice id={id} role="alert" tone="error" className={className}>
      {message}
    </Notice>
  );
}
