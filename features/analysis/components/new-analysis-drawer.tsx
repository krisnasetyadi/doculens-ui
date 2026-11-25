"use client";

// New analysis drawer (MS-916), opened from the Analysis page. The workspace
// layout mounts it once, so a run keeps going when the drawer closes or the
// user moves to another page, and its result is announced wherever they are.
// The only kind today is a gap analysis (skill compliance_gap_check). Since
// MS-1114 it starts from one sentence: the AI suggests the rule file and the
// folders, drafts the requirement list, and the user approves it before the
// check starts (features/analysis/components/setup).
//
// Look: shares the Settings dialog's tokens (workspace/settings-ui) so both
// surfaces read as one product. Sizes stay on the drawer's own compact scale
// (px): title 18 / section title 13 / control + body 12 / helper + meta 11.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CircleCheck, FileSearch, ShieldCheck } from "lucide-react";
import { gapAnalysisMutations } from "@/services/gap-analysis/handler/gap-analysis.queries";
import type { GapAnalysisResponse } from "@/services/gap-analysis/type/gap-analysis.type";
import { pdfCollectionsQueries } from "@/services/pdf-collections/handler/pdf-collections.queries";
import { useAnalysisRunStore } from "@/stores/analysis-run-store";
import { ToastAction } from "@/components/ui/toast";
import { useToast, errorToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Notice } from "@/components/notice";
import { useAnalysisSetup, type SetupRun } from "../hooks/use-analysis-setup";
import { AnalysisSetup } from "./setup/analysis-setup";

const REDIRECT_COUNTDOWN_SECONDS = 3;

// The drawer is sized at 98% of the stock scale (what 110% browser zoom gave
// the old 89.1%): Tailwind's spacing and type variables are scaled here
// instead of using CSS zoom, so the drawer lays out at real pixels. Literal px values are written pre-scaled (x0.98).
// The [&_.border*] variants scale the literal 1px borders the way zoom did.
const DRAWER_SCALE_CLASS =
  "text-base [--spacing:0.245025rem] [--text-xs:0.735075rem] [--text-sm:0.8575875rem] [--text-base:0.9801rem] [--text-lg:1.1026125rem] [--radius:0.49005rem] [&_.border]:border-[0.9801px] [&_.border-t]:border-t-[0.9801px] [&_.border-b]:border-b-[0.9801px] [&_.border-l]:border-l-[0.9801px] [&_.border-r]:border-r-[0.9801px] [&_.border-0]:border-0!";

const LEAVE_WARNING = "An analysis is still running. Leaving now stops it.";

export function NewAnalysisDrawer() {
  const { toast } = useToast();
  const router = useRouter();
  const open = useAnalysisRunStore((s) => s.drawerOpen);
  const onOpenChange = useAnalysisRunStore((s) => s.setDrawerOpen);
  const active = useAnalysisRunStore((s) => s.active);
  const setActive = useAnalysisRunStore((s) => s.setActive);
  const continued = useAnalysisRunStore((s) => s.continued);
  const stopContinuing = useAnalysisRunStore((s) => s.stopContinuing);
  const runMutation = useMutation(gapAnalysisMutations.run());
  // Only to name the documents of a running check (Analysis page, nav status).
  const collectionsQuery = useQuery({ ...pdfCollectionsQueries.list(), enabled: open });
  const setup = useAnalysisSetup();
  // From the store, not the mutation: the drawer can unmount and mount again while a run is going
  // (a page outside the workspace layout), and a fresh mutation hook knows nothing of it.
  const running = active?.status === "running";
  const failed = active?.status === "failed";
  const [result, setResult] = useState<GapAnalysisResponse | null>(null);

  // Auto-redirect-after-success state is kept in a ref (not React state) since the countdown ticks
  // via setInterval and only ever needs to mutate a toast that's already been dispatched.
  const pendingRedirectRef = useRef<{ timer: ReturnType<typeof setInterval>; dismiss: () => void } | null>(null);

  const clearPendingRedirect = () => {
    if (pendingRedirectRef.current) {
      clearInterval(pendingRedirectRef.current.timer);
      pendingRedirectRef.current.dismiss();
      pendingRedirectRef.current = null;
    }
  };

  useEffect(() => () => clearPendingRedirect(), []);

  // Known limit, said in the drawer while it runs: the run is tied to this tab. Leaving warns first.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = LEAVE_WARNING;
      return LEAVE_WARNING;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  /** A finished run opens on its own result page: it has the width a data-dense table needs. */
  const handleViewRun = (runId: string) => {
    clearPendingRedirect();
    handleClose(false);
    router.push(`/analysis/${runId}`);
  };

  /** The finished run, announced wherever the user is. It only opens by itself where they are
   * already looking at it (the Analysis page or this drawer); anywhere else the toast offers it, and
   * the drawer keeps no result, so the next opening starts on a blank form. */
  const announceResult = (data: GapAnalysisResponse) => {
    const runId = data.run.run_id;
    clearPendingRedirect();
    const watching = useAnalysisRunStore.getState().drawerOpen || window.location.pathname.startsWith("/analysis");
    setResult(watching ? data : null);
    if (!watching) {
      toast({
        title: "Analysis complete",
        description: `"${data.run.framework_name}" is ready.`,
        variant: "success",
        action: (
          <ToastAction altText="View result" onClick={() => handleViewRun(runId)}>
            View result
          </ToastAction>
        ),
      });
      return;
    }
    let secondsLeft = REDIRECT_COUNTDOWN_SECONDS;
    const t = toast({
      title: "Analysis complete",
      description: `Opening the full result in ${secondsLeft} seconds…`,
      variant: "success",
    });
    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        handleViewRun(runId);
        return;
      }
      t.update({
        id: t.id,
        title: "Analysis complete",
        description: `Opening the full result in ${secondsLeft} seconds…`,
        variant: "success",
      });
    }, 1000);
    pendingRedirectRef.current = { timer, dismiss: t.dismiss };
  };

  const startRun = ({ body, frameworkName, documentIds }: SetupRun) => {
    // One run at a time: while one is going, the drawer shows it instead of the form.
    if (useAnalysisRunStore.getState().active?.status === "running") return;
    setResult(null);
    const names = new Map((collectionsQuery.data ?? []).map((c) => [c.collection_id, c.title || c.file_names?.[0] || c.collection_id]));
    const started = {
      frameworkName,
      documentNames: documentIds.map((id) => names.get(id) ?? id),
      startedAt: Date.now(),
    };
    setActive({ ...started, status: "running" });
    // Settled on the promise, not mutate()'s callbacks: TanStack drops those when this component
    // unmounts, which would leave the store saying "running" for good.
    const isCurrent = () => useAnalysisRunStore.getState().active?.startedAt === started.startedAt;
    runMutation.mutateAsync(body).then(
      (data) => {
        if (!isCurrent()) return;
        setActive(null);
        // The answers are spent; the next opening starts fresh.
        setup.reset();
        stopContinuing();
        announceResult(data);
      },
      (err: unknown) => {
        if (!isCurrent()) return;
        // The answers stay, so Try again reopens the drawer with exactly what was sent.
        setActive({ ...started, status: "failed", error: err instanceof Error ? err.message : undefined });
        toast({
          ...errorToast("Couldn't run the analysis", err),
          action: (
            <ToastAction altText="Try again" onClick={() => onOpenChange(true)}>
              Try again
            </ToastAction>
          ),
        });
      },
    );
  };

  const handleClose = (next: boolean) => {
    // Closing while a run is in flight only hides the drawer: the request keeps going, and
    // reopening shows the same running state instead of a blank form. A failed run keeps its
    // answers for Try again. Otherwise close and start over next time.
    // Read from the store, not this render: a countdown or toast set up by an earlier render calls
    // this too, and what it saw then may no longer hold.
    if (!next && useAnalysisRunStore.getState().active) {
      onOpenChange(false);
      return;
    }
    if (!next) {
      clearPendingRedirect();
      setResult(null);
      setup.reset();
      stopContinuing();
    }
    onOpenChange(next);
  };

  /** Leaves a failed run behind: the answers stay as they were, for another try. */
  const dismissFailure = () => setActive(null);

  const showForm = !result && !running;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 border-border bg-card p-0 font-inter shadow-[0_24px_70px_rgba(24,32,51,0.15)] sm:max-w-[1080px] border-l-[0.9801px] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)] [&>button:last-child]:right-5 sm:[&>button:last-child]:right-9 [&>button:last-child]:top-6 [&>button:last-child]:p-1 [&>button:last-child]:text-foreground [&>button:last-child]:opacity-80 [&>button:last-child:hover]:opacity-100",
          DRAWER_SCALE_CLASS,
        )}
      >
        <SheetHeader className="gap-0 bg-card px-5 pb-4 pt-6 pr-14 sm:px-9 sm:pr-[76.23px]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <SheetTitle className="font-manrope text-base font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                New analysis
              </SheetTitle>
            </div>
            <SheetDescription className="mt-1 text-[11.7612px] leading-4 text-muted-foreground">
              Say what you want to check. The AI finds the rules and the documents, and you approve the list before it starts.
            </SheetDescription>
          </div>
        </SheetHeader>
        <div className="mx-5 shrink-0 border-t border-border sm:mx-9" />

        {showForm && (
          <AnalysisSetup
            setup={setup}
            continued={continued}
            onCancel={() => handleClose(false)}
            onStart={startRun}
            notice={
              failed && (
                <Notice tone="error" className="mt-4 shrink-0 gap-1.5 px-2.5 py-2 text-[10.7811px] leading-4 [&_svg]:size-3">
                  The last run failed{active?.error ? `: ${active.error}` : ""}. Your choices are still here; start it
                  again, or{" "}
                  <button type="button" onClick={dismissFailure} className="font-semibold underline underline-offset-2">
                    dismiss
                  </button>
                  .
                </Notice>
              )
            }
          />
        )}

        {!showForm && (
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 py-5 sm:px-9">
              {running && (
                <div className="space-y-3">
                  <EmptyState
                    size="compact"
                    icon={Spinner}
                    heading={`Running "${active?.frameworkName ?? "analysis"}"`}
                    description="This can take a while for large frameworks. You can close this panel and keep working; you will be told when it is done."
                  />
                  <Notice tone="info" className="gap-1.5 px-2.5 py-2 text-[10.7811px] leading-4 [&_svg]:size-3">
                    The analysis runs in this browser tab. Keep DocuLens open until it finishes: reloading or closing
                    the tab stops it. Only one analysis can run at a time.
                  </Notice>
                </div>
              )}

              {result && !running && (
                <div className="space-y-3">
                  <EmptyState
                    size="compact"
                    icon={CircleCheck}
                    heading="Analysis complete"
                    description={`${result.total_requirements - result.not_checked} requirements checked against "${result.run.framework_name}". What needs doing, and where in each document, opens on its own page.`}
                  />
                  {result.disclaimer && (
                    <p className="border-l-[1.9602px] pl-3 text-[10.7811px] italic text-muted-foreground">{result.disclaimer}</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {result && !running && (
          <SheetFooter className="mt-0 gap-0 bg-card p-0 px-5 sm:px-9">
            <div className="ml-auto flex items-center gap-2 border-t border-border py-4">
              <Button
                variant="outline"
                onClick={() => {
                  clearPendingRedirect();
                  setResult(null);
                }}
              >
                New analysis
              </Button>
              <Button onClick={() => handleViewRun(result.run.run_id)}>
                <FileSearch className="size-3.5" />
                View full results
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
