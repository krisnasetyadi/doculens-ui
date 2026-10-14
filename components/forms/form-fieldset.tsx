import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Locks a whole form while its action runs. A native `<fieldset disabled>` disables every control
 * inside it (inputs, textareas, selects, buttons, Radix switches and checkboxes, file inputs), so a
 * screen does not have to remember `disabled={busy}` on each field, and a field added later is
 * covered without being touched. Values are kept: disabling never clears a field.
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
  ...props
}: Omit<React.ComponentProps<"fieldset">, "disabled"> & { busy: boolean }) {
  return (
    <fieldset
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn("contents min-w-0 border-0 p-0 m-0", className)}
      {...props}
    />
  );
}

export { FormFieldset };
