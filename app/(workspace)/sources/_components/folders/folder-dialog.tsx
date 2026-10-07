import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DIALOG_BUTTON_CLASS,
  DIALOG_PRIMARY_CLASS,
  DIALOG_TITLE_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
} from "../sources-ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    if (!name.trim()) return;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={DIALOG_TITLE_CLASS}>
            {isRename ? "Rename Folder" : parentName ? `New Folder in ${parentName}` : "New Folder"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <label className={FIELD_LABEL_CLASS}>
            Folder name
          </label>
          <Input
            autoFocus
            placeholder="Contracts"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className={FIELD_INPUT_CLASS}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={DIALOG_BUTTON_CLASS}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className={DIALOG_PRIMARY_CLASS}
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {isRename ? "Save" : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
