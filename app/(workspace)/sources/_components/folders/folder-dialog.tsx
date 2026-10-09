import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFieldset } from "@/components/forms/form-fieldset";
import {
} from "../sources-ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/** Create or rename a folder — same dialog, driven by whether `initialName`
 * is set. Used by both the "New Folder" action and a folder chip's Rename
 * item, so there's one place that owns the name-validation UX. */
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
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const isRename = initialName !== undefined;

  useEffect(() => {
    if (open) setName(initialName ?? "");
  }, [open, initialName]);

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } catch {
      // The caller shows the API error; leave the dialog open for correction.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isRename ? "Rename Folder" : parentName ? `New Folder in ${parentName}` : "New Folder"}
          </DialogTitle>
        </DialogHeader>

        <FormFieldset busy={saving}>
          <div className="space-y-1.5 py-1">
            <Label>
              Folder name
            </Label>
            <Input
              autoFocus
              placeholder="Contracts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              loading={saving}
              loadingText={isRename ? "Saving…" : "Creating…"}
              disabled={!name.trim()}
            >
              {isRename ? "Save" : "Create Folder"}
            </Button>
          </DialogFooter>
        </FormFieldset>
      </DialogContent>
    </Dialog>
  );
}
