import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { FormInput } from "@/components/forms/form-input";
import { publicLinkSchema, type PublicLinkValues } from "../../_lib/source-forms";

const EMPTY: PublicLinkValues = { title: "", url: "" };

/** Sources → Public Links → Add link. `onSave` resolves to a message for the URL field when the
 * server refused the URL, or null when it saved (the caller closes the dialog) or showed a toast. */
export function PublicLinkDialog({
  open,
  onOpenChange,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSave: (values: PublicLinkValues) => Promise<string | null>;
}) {
  const form = useForm<PublicLinkValues>({
    resolver: zodResolver(publicLinkSchema),
    defaultValues: EMPTY,
  });

  // Every opening starts clean: no values left from last time and no messages.
  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    const urlError = await onSave(values);
    if (urlError) form.setError("url", { message: urlError }, { shouldFocus: true });
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Public Link Source
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="contents">
          <FormFieldset busy={saving}>
            <div className="space-y-3 py-1">
              <FormInput
                control={form.control}
                name="title"
                label="Source title"
                placeholder="Engineering Manuals"
                description="Optional. This becomes the label shown in the sources list."
              />
              <FormInput
                control={form.control}
                name="url"
                label="Public URL"
                type="url"
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                description="Supports public Google Drive links and other publicly accessible URLs."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} loadingText="Saving…">
                Save Link Source
              </Button>
            </DialogFooter>
          </FormFieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
