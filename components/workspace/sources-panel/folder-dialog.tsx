import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present -> renaming that folder's name; absent -> creating a new one. */
  initialName?: string;
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm font-['Inter']">
        <DialogHeader>
          <DialogTitle className="font-['Manrope'] font-extrabold text-foreground">
            {isRename ? "Rename Folder" : "New Folder"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
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
            className="h-9 text-sm"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-['Manrope'] font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRename ? "Save" : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
