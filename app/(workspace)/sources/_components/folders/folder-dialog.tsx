import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { FormInput } from "@/components/forms/form-input";
import { FormRootError } from "@/components/forms/form-root-error";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { folderNameSchema, type FolderNameValues } from "../../_lib/source-forms";

/** Create or rename a folder — same dialog, driven by whether `initialName`
 * is set. Used by both the "New Folder" action and a folder chip's Rename
 * item, so there's one place that owns the name-validation UX.
 *
 * `onSubmit` resolves when the folder was saved (the dialog closes), resolves to a message when the
 * server refused the folder as a whole (shown above the button), or rejects after its own toast
 * (the dialog stays open for another try). */
export function FolderDialog({
  open,
  onOpenChange,
  initialName,
  parentName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present -> renaming that folder's name; absent -> creating a new one. */
  initialName?: string;
  parentName?: string;
  onSubmit: (name: string) => Promise<string | null | void> | void;
}) {
  const isRename = initialName !== undefined;
  const form = useForm<FolderNameValues>({
    resolver: zodResolver(folderNameSchema),
    defaultValues: { name: initialName ?? "" },
  });
  const saving = form.formState.isSubmitting;

  // Every opening starts from the folder's current name (or empty), with no messages.
  useEffect(() => {
    if (open) form.reset({ name: initialName ?? "" });
  }, [open, initialName, form]);

  const submit = form.handleSubmit(async ({ name }) => {
    try {
      const refusal = await onSubmit(name);
      if (refusal) {
        form.setError("root", { message: refusal });
        return;
      }
      onOpenChange(false);
    } catch {
      // The caller showed the failure as a toast; keep the dialog open with the name for another try.
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isRename ? "Rename Folder" : parentName ? `New Folder in ${parentName}` : "New Folder"}
          </DialogTitle>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="contents">
          <FormFieldset busy={saving}>
            <div className="py-1">
              <FormInput
                control={form.control}
                name="name"
                label="Folder name"
                placeholder="Contracts"
                autoFocus
              />
            </div>

            <FormRootError form={form} />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={saving}
                loadingText={isRename ? "Saving…" : "Creating…"}
              >
                {isRename ? "Save" : "Create Folder"}
              </Button>
            </DialogFooter>
          </FormFieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
