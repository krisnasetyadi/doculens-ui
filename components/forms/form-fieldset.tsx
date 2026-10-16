import { useEffect, useRef, type ComponentProps, type FocusEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * Locks a whole form while its action runs. A native `<fieldset disabled>` disables every control
 * inside it (inputs, textareas, selects, buttons, Radix switches and checkboxes, file inputs), so a
 * screen does not have to remember `disabled={busy}` on each field, and a field added later is
 * covered without being touched. Values are kept: disabling never clears a field.
 *
 * Disabling the focused control drops focus, and a server message set while the form is still
 * locked (`setError(name, ..., { shouldFocus: true })`) cannot focus a disabled field. So when the
 * lock lifts with focus outside the form, focus goes to the first invalid field, or else back to the
 * control the user was on.
 *
 * By default it is `display: contents`, out of the layout: right when its children sit directly in
 * a grid or flex parent (a dialog body). When the form's own layout relies on child selectors
 * (`space-y-*`, `divide-y`), move those classes onto the fieldset and pass `block` or `flex`, since
 * a contents element has no box for them to apply to.
 *
 * Put the dialog's Cancel inside it too, and make the dialog ignore close requests while `busy`
 * (see `onOpenChange` in FolderDialog), so a request cannot be abandoned half way.
 */
function FormFieldset({
  busy,
  className,
  onFocus,
  ...props
}: Omit<ComponentProps<"fieldset">, "disabled"> & { busy: boolean }) {
  const ref = useRef<HTMLFieldSetElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const wasBusy = useRef(busy);

  useEffect(() => {
    const unlocked = wasBusy.current && !busy;
    wasBusy.current = busy;
    const root = ref.current;
    if (!unlocked || !root || root.contains(document.activeElement)) return;
    const target = root.querySelector<HTMLElement>('[aria-invalid="true"]') ?? lastFocused.current;
    if (target && root.contains(target)) target.focus();
  }, [busy]);

  return (
    <fieldset
      ref={ref}
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn("contents min-w-0 border-0 p-0 m-0", className)}
      onFocus={(event: FocusEvent<HTMLFieldSetElement>) => {
        lastFocused.current = event.target as HTMLElement;
        onFocus?.(event);
      }}
      {...props}
    />
  );
}

export { FormFieldset };
