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
}

interface AnalysisRunState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  active: ActiveAnalysis | null;
  setActive: (active: ActiveAnalysis | null) => void;
  /** On logout: the next user on this tab must not see the last one's run. */
  reset: () => void;
}

export const useAnalysisRunStore = create<AnalysisRunState>()((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  active: null,
  setActive: (active) => set({ active }),
  reset: () => set({ drawerOpen: false, active: null }),
}));
