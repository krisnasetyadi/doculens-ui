"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileSearch, RotateCw, TriangleAlert } from "lucide-react";
import { isMissingError } from "@/services/api-error";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast, errorToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { saveBlob } from "@/lib/save-file";
import { filesQueries } from "@/services/files/handler/files.queries";
import { gapAnalysisQueries } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisPointer, GapAnalysisResponse } from "@/services/gap-analysis/type/gap-analysis.type";
import { useAnalysisRunStore } from "@/stores/analysis-run-store";
import { canOpen, checkedItems, pointerOpen, todoCount } from "./_lib/results";
import { useResultSelection } from "./_hooks/use-result-selection";
import { ResultHeader } from "./_components/result-header";
import { ResultsSummary } from "./_components/results-summary";
import { ResultsTip } from "./_components/results-tip";
import { RequirementList } from "./_components/requirement-list";
import { RequirementDetail } from "./_components/requirement-detail";
import { PointerViewer } from "./_components/pointer-viewer";

// Centers a state between the Back row and the bottom of the scroll area. The
// negative margins cancel the container's gap-4 (top) and py-8 (bottom), so the
// state is centered in exactly that space. Change those two and change this.
const CENTERED_STATE_CLASS = "-mb-8 -mt-4 flex flex-1 items-center justify-center";

/** A run's result (MS-1112): what needs doing first, grouped by status, and for the picked
 * requirement what is missing, the next step, and pointers to the exact place in each document. */
export default function AnalysisResultPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const runQuery = useQuery(gapAnalysisQueries.run(runId));

  return (
    <div className="h-full overflow-y-auto bg-background [scrollbar-gutter:stable_both-edges]">
      <div className="flex min-h-full max-w-7xl flex-col gap-4 mx-auto px-4 sm:px-8 py-8">
        <Link
          href="/analysis"
          className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analysis
        </Link>

        {runQuery.isPending && <ResultSkeleton />}

        {runQuery.isError && isMissingError(runQuery.error) && (
          <div className={CENTERED_STATE_CLASS}>
            <EmptyState
              icon={FileSearch}
              heading="Result not found"
              description="This analysis may have been deleted, or it belongs to another account."
              action={{ label: "Back to Analysis", onClick: () => router.push("/analysis"), icon: ArrowLeft }}
              ctaVariant="primary"
            />
          </div>
        )}

        {runQuery.isError && !isMissingError(runQuery.error) && (
          <div className={CENTERED_STATE_CLASS}>
            <EmptyState
              icon={TriangleAlert}
              heading="Could not load this result"
              description="Something went wrong while loading it. Try again in a moment."
              action={{ label: "Try again", onClick: () => void runQuery.refetch(), icon: RotateCw }}
              ctaVariant="primary"
            />
          </div>
        )}

        {runQuery.data && <Result result={runQuery.data} />}
      </div>
    </div>
  );
}

function Result({ result }: { result: GapAnalysisResponse }) {
  const { run } = result;
  const items = useMemo(() => checkedItems(result.items), [result.items]);
  const selection = useResultSelection(items, todoCount(result.summary) > 0);
  const openPointer = usePointerOpener();
  const continueInDrawer = useAnalysisRunStore((s) => s.continueInDrawer);
  const openNewAnalysis = useAnalysisRunStore((s) => s.setDrawerOpen);

  // "Check all N requirements": the same analysis, with the documents the skipped requirements need.
  const checkAll = () =>
    run.analysis_id
      ? continueInDrawer({ analysisId: run.analysis_id, referenceId: run.reference_collection_ids[0], frameworkName: run.framework_name })
      : openNewAnalysis(true);

  return (
    <>
      <ResultHeader run={run} />
      <ResultsSummary
        summary={result.summary}
        notChecked={result.not_checked}
        totalRequirements={result.total_requirements}
        onCheckAll={checkAll}
      />
      <ResultsTip />

      {items.length === 0 ? (
        <EmptyState
          size="compact"
          icon={FileSearch}
          heading="No requirements checked"
          description={
            result.not_checked > 0
              ? "None of the selected documents is the kind these requirements need. Pick more documents in a new analysis."
              : "No requirements could be read from the reference document."
          }
          className="my-4"
        />
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <RequirementList
            items={items}
            tab={selection.tab}
            onTabChange={selection.changeTab}
            selectedKey={selection.selectedKey}
            onSelect={selection.select}
            expanded={selection.expanded}
            onExpand={selection.expand}
          />
          {selection.selected && (
            <RequirementDetail
              entry={selection.selected}
              previousRunAt={run.previous_run_at ? formatDate(run.previous_run_at) : null}
              onOpenPointer={openPointer.open}
            />
          )}
        </div>
      )}

      {result.disclaimer && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{result.disclaimer}</p>
      )}
      <PointerViewer pointer={openPointer.pointer} onClose={openPointer.close} />
    </>
  );
}

/** Opening a finding's pointer: in a viewer when one can show the format, else the file is saved. */
function usePointerOpener() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pointer, setPointer] = useState<GapAnalysisPointer | null>(null);
  const close = useCallback(() => setPointer(null), []);

  const open = (target: GapAnalysisPointer) => {
    if (!canOpen(target)) return;
    if (pointerOpen(target).mode !== "download") {
      setPointer(target);
      return;
    }
    queryClient
      .fetchQuery(filesQueries.document(target.collection_id, target.file_name))
      .then((blob) => saveBlob(blob, target.file_name))
      .catch((err: unknown) => toast(errorToast("Couldn't open the document", err, "It may have been deleted.")));
  };

  return { pointer, open, close };
}

function ResultSkeleton() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Loading result…</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="flex w-full justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-72" />
        </div>
        <Skeleton className="h-[96px] w-full" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-[520px] min-w-0 flex-[1_1_420px]" />
          <Skeleton className="h-[520px] min-w-0 flex-[1.3_1_460px]" />
        </div>
      </div>
    </div>
  );
}
