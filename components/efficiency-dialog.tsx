"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EfficientModeSettings } from "@/components/workspace/efficient-mode/efficient-mode-settings";

/** "/efficiency" popup — MS-247. Same idea as UsageDialog for "/usage":
 * a lightweight dialog reachable straight from the chat composer, reusing
 * the exact same card/data as Settings > Efficient Mode rather than
 * duplicating the fetch logic. */
interface EfficiencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EfficiencyDialog({ open, onOpenChange }: EfficiencyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">Efficient Mode</DialogTitle>
        <EfficientModeSettings active={open} />
      </DialogContent>
    </Dialog>
  );
}
