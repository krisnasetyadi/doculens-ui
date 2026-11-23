import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One-time tips on the Analysis pages that the user dismissed (MS-1112). Kept in this browser:
 * seeing a tip again on another device costs one click, a server round trip per page does not pay
 * for that. */
interface AnalysisHintsState {
  resultsTipDismissed: boolean;
  dismissResultsTip: () => void;
}

export const useAnalysisHintsStore = create<AnalysisHintsState>()(
  persist(
    (set) => ({
      resultsTipDismissed: false,
      dismissResultsTip: () => set({ resultsTipDismissed: true }),
    }),
    { name: "doculens-analysis-hints", version: 1 },
  ),
);
