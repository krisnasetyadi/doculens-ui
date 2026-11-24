"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, FileText, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem } from "@/components/action-menu";
import { MENU_LUCIDE, MenuIcon } from "@/components/ui/menu-icons";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useToast, errorToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date";
import { saveBlob } from "@/lib/save-file";
import { gapAnalysisKeys } from "@/services/gap-analysis/handler/gap-analysis.keys";
import { gapAnalysisMutations } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisExportFormat, GapAnalysisRun } from "@/services/gap-analysis/type/gap-analysis.type";
import { searchedText } from "../_lib/results";
import { useCheckAgain } from "../_hooks/use-check-again";

/** A result's title (its goal, else its framework), what was checked and when, and what can be
 * done with the whole run: download it, check it again, delete it. */
export function ResultHeader({ run }: { run: GapAnalysisRun }) {
  const title = run.goal || run.framework_name;
  const scope = searchedText(run.searched);
  const checkAgain = useCheckAgain(run);

  return (
    <div className="flex w-full flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-manrope text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Gap analysis</p>
        <h1 className="mt-1 font-manrope text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {scope ? `${scope} checked against ` : "Checked against "}
          {run.framework_name} · {formatDateTime(run.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DownloadMenu runId={run.run_id} />
        {/* The scenario skill is still a scaffold with nothing to check again. */}
        {run.skill_id === "compliance_gap_check" && (
          <Button
            variant="outline"
            onClick={checkAgain.start}
            loading={checkAgain.checking}
            loadingText="Checking…"
            disabled={checkAgain.blocked}
            title={checkAgain.blocked ? "Another analysis is running. Check again when it finishes." : undefined}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Check again
          </Button>
        )}
        <DeleteRunButton runId={run.run_id} title={title} />
      </div>
    </div>
  );
}

function DownloadMenu({ runId }: { runId: string }) {
  const { toast } = useToast();
  const exportMutation = useMutation(gapAnalysisMutations.export());

  const download = (format: GapAnalysisExportFormat) =>
    exportMutation.mutate(
      { runId, format },
      {
        onSuccess: (blob) => saveBlob(blob, `gap-analysis-${runId}.${format === "pdf" ? "pdf" : "md"}`),
        onError: (err) => toast(errorToast("Couldn't download the result", err)),
      },
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          loading={exportMutation.isPending}
          loadingText="Downloading…"
          icon={<Download className="h-4 w-4" />}
        >
          Download
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <ActionMenuContent align="end">
        <ActionMenuItem onClick={() => download("pdf")}>
          <MenuIcon><FileText {...MENU_LUCIDE} /></MenuIcon>
          PDF
        </ActionMenuItem>
        <ActionMenuItem onClick={() => download("markdown")}>
          <MenuIcon><FileText {...MENU_LUCIDE} /></MenuIcon>
          Markdown
        </ActionMenuItem>
      </ActionMenuContent>
    </DropdownMenu>
  );
}

function DeleteRunButton({ runId, title }: { runId: string; title: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useMutation(gapAnalysisMutations.delete());
  const [confirming, setConfirming] = useState(false);

  /** Resolves to false on failure, so the confirmation stays open for another try. */
  const deleteRun = () =>
    deleteMutation
      .mutateAsync(runId)
      .then(() => {
        router.push("/analysis");
        // The page is leaving; drop its cached result instead of refetching a run that is gone.
        queryClient.removeQueries({ queryKey: gapAnalysisKeys.run(runId) });
        toast({ title: "Analysis deleted", variant: "success" });
        return true;
      })
      .catch((err: unknown) => {
        toast(errorToast("Couldn't delete this analysis", err));
        return false;
      });

  return (
    <>
      <Button variant="outline" onClick={() => setConfirming(true)} icon={<Trash2 className="h-4 w-4" />}>
        Delete
      </Button>
      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this analysis?"
        description={`"${title}" and its result will be removed. This cannot be undone.`}
        onConfirm={deleteRun}
      />
    </>
  );
}
