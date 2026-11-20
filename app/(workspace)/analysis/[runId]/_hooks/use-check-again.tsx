"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast, errorToast } from "@/hooks/use-toast";
import { gapAnalysisMutations } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisRequest, GapAnalysisRun } from "@/services/gap-analysis/type/gap-analysis.type";
import { useAnalysisRunStore } from "@/stores/analysis-run-store";

/**
 * "Check again" (MS-1112): the same analysis run once more over the same documents, so every
 * requirement's trend compares with this run. It is tracked in the analysis run store like a run
 * from the New analysis drawer, so the menu shows it and only one analysis runs at a time.
 *
 * - `checking`: this result is being checked again.
 * - `blocked`: another analysis is running, so this one has to wait.
 *
 * When it finishes while the user is still on this result, the new result opens; anywhere else a
 * toast offers it.
 */
export function useCheckAgain(run: GapAnalysisRun | null) {
  const router = useRouter();
  const { toast } = useToast();
  const runMutation = useMutation(gapAnalysisMutations.run());
  const active = useAnalysisRunStore((s) => (s.active?.status === "running" ? s.active : null));
  const setActive = useAnalysisRunStore((s) => s.setActive);

  const checking = !!run && active?.repeatsRunId === run.run_id;
  const blocked = !!active && !checking;

  const start = () => {
    if (!run || useAnalysisRunStore.getState().active?.status === "running") return;
    const startedAt = Date.now();
    setActive({
      frameworkName: run.framework_name,
      documentNames: run.target_collection_ids.map((id) => run.collection_labels[id] ?? id),
      startedAt,
      status: "running",
      repeatsRunId: run.run_id,
    });
    // Settled on the promise, not mutate()'s callbacks: those are dropped when the page unmounts.
    const isCurrent = () => useAnalysisRunStore.getState().active?.startedAt === startedAt;
    runMutation.mutateAsync(sameAnalysisAgain(run)).then(
      (data) => {
        if (!isCurrent()) return;
        setActive(null);
        announce(data.run);
      },
      (err: unknown) => {
        if (!isCurrent()) return;
        setActive(null);
        toast({
          ...errorToast("Couldn't check again", err),
          action: <ToastAction altText="Try again" onClick={start}>Try again</ToastAction>,
        });
      },
    );
  };

  const announce = (next: GapAnalysisRun) => {
    const nextPath = `/analysis/${next.run_id}`;
    if (run && window.location.pathname === `/analysis/${run.run_id}`) {
      router.push(nextPath);
      toast({ title: "Checked again", description: "Each requirement now shows how it moved since the last check.", variant: "success" });
      return;
    }
    toast({
      title: "Checked again",
      description: `"${next.framework_name}" is ready.`,
      variant: "success",
      action: <ToastAction altText="View result" onClick={() => router.push(nextPath)}>View result</ToastAction>,
    });
  };

  return { start, checking, blocked };
}

function sameAnalysisAgain(run: GapAnalysisRun): GapAnalysisRequest {
  return {
    skill_id: run.skill_id,
    reference_collection_ids: run.reference_collection_ids,
    framework_name: run.framework_name,
    target_collection_ids: run.target_collection_ids,
    analysis_id: run.analysis_id,
    target_folder_ids: run.target_folder_ids,
  };
}
