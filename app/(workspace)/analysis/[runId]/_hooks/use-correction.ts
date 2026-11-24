"use client";

import { useMutation } from "@tanstack/react-query";
import { useToast, errorToast } from "@/hooks/use-toast";
import { gapAnalysisMutations } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisCorrectionRequest } from "@/services/gap-analysis/type/gap-analysis.type";

/**
 * Correcting an item's status, and undoing it (MS-1115). The mutations put the run the server
 * answers with in the cache, so the counts, groups and the item update at once.
 *
 * `save` resolves when the correction is stored and rejects after its own toast, so the dialog
 * stays open with what was typed. `onSettled` runs after an undo: the Undo button is gone by then, so
 * focus needs a new place (after a save, the closing dialog moves focus itself).
 */
export function useCorrection(runId: string, onSettled: () => void) {
  const { toast } = useToast();
  const correctMutation = useMutation(gapAnalysisMutations.correct());
  const undoMutation = useMutation(gapAnalysisMutations.undoCorrection());

  const save = (itemId: number, body: GapAnalysisCorrectionRequest) =>
    correctMutation.mutateAsync({ runId, itemId, body }).then(
      () => {
        toast({ title: "Correction saved", description: "The results and the export now use your status.", variant: "success" });
      },
      (err: unknown) => {
        toast(errorToast("Couldn't save the correction", err));
        throw err;
      },
    );

  /** `direction`: what the correction added to the analysis's directions, which an undo keeps. */
  const undo = (itemId: number, direction: string | null) =>
    undoMutation.mutate(
      { runId, itemId },
      {
        onSuccess: () => {
          toast({
            title: "Correction undone",
            description: direction
              ? "The item shows the AI's status again. The direction it added stays in this analysis's directions."
              : "The item shows the AI's status again.",
          });
          onSettled();
        },
        onError: (err) => toast(errorToast("Couldn't undo the correction", err)),
      },
    );

  /** The item whose correction is being undone, so only its button says "Undoing…". */
  const undoingItemId = undoMutation.isPending ? (undoMutation.variables?.itemId ?? null) : null;

  return { save, undo, undoingItemId };
}
