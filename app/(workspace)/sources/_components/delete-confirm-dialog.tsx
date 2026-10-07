import { useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DIALOG_BUTTON_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_DESTRUCTIVE_CLASS,
  DIALOG_TITLE_CLASS,
} from "@/lib/sources-ui";

/** Confirm-and-delete dialog that holds still while the delete runs, the way
 * FolderDialog does while a folder is being created: the confirm button shows
 * a spinner, Cancel and Escape are ignored, and the dialog closes only once
 * `onConfirm` has settled. Resolving to `false` means the delete failed (the
 * caller has already shown the error), so the dialog stays open for a retry. */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  trigger,
  contentProps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  onConfirm: () => Promise<boolean | void> | void;
  /** Optional `AlertDialogTrigger`, for dialogs opened from a button rather than a menu item. */
  trigger?: ReactNode;
  contentProps?: ComponentProps<typeof AlertDialogContent>;
}) {
  const [pending, setPending] = useState(false);

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    // Radix closes the dialog on every Action click; keep it open until the work is done.
    event.preventDefault();
    if (pending) return;
    setPending(true);
    let ok: boolean | void = true;
    try {
      ok = await onConfirm();
    } catch {
      ok = false;
    } finally {
      setPending(false);
    }
    if (ok !== false) onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      {trigger}
      <AlertDialogContent {...contentProps}>
        <AlertDialogHeader>
          <AlertDialogTitle className={DIALOG_TITLE_CLASS}>{title}</AlertDialogTitle>
          <AlertDialogDescription className={DIALOG_DESCRIPTION_CLASS}>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className={DIALOG_BUTTON_CLASS}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            aria-busy={pending}
            onClick={handleConfirm}
            className={DIALOG_DESTRUCTIVE_CLASS}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
