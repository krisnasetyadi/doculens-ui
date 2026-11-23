import { create } from "zustand";

/** The analysis being run right now, as the user started it (MS-916). Client state only: the
 * request is started by the New analysis drawer, which the workspace layout keeps mounted, and it
 * settles this entry itself, so the run survives the drawer closing, unmounting, and the user moving
 * between pages. The saved run is read from TanStack Query once the server has it. */
export interface ActiveAnalysis {
  frameworkName: string;
  documentNames: string[];
  /** Also tells one run from the next: a request that settles after its entry was replaced or
   * cleared (a newer run, a logout) leaves the store alone. */
  startedAt: number;
  status: "running" | "failed";
  error?: string;
  /** Set when the run is a "Check again" from a result page (MS-1112): the run it repeats. */
  repeatsRunId?: string;
}

/** An analysis the New analysis drawer continues instead of starting a new one (MS-1112): its
 * reference is filled in, and the run is filed under it, so its results compare with the last check. */
export interface ContinuedAnalysis {
  analysisId: string;
  referenceId: string;
  frameworkName: string;
}

interface AnalysisRunState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  continued: ContinuedAnalysis | null;
  /** Opens the drawer on an existing analysis, e.g. to check requirements its last run skipped. */
  continueInDrawer: (analysis: ContinuedAnalysis) => void;
  /** The drawer's form was reset: the next run starts a new analysis. */
  stopContinuing: () => void;
  active: ActiveAnalysis | null;
  setActive: (active: ActiveAnalysis | null) => void;
  /** On logout: the next user on this tab must not see the last one's run. */
  reset: () => void;
}

export const useAnalysisRunStore = create<AnalysisRunState>()((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  continued: null,
  continueInDrawer: (continued) => set({ drawerOpen: true, continued }),
  stopContinuing: () => set({ continued: null }),
  active: null,
  setActive: (active) => set({ active }),
  reset: () => set({ drawerOpen: false, continued: null, active: null }),
}));
