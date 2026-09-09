import { create } from "zustand";
import { persist } from "zustand/middleware";

/** MS-247 "Efficient Mode" — isolated on purpose (not merged into
 * workspace-store.ts). This is an experimental, caveman-inspired
 * context-compression toggle: if it doesn't pan out, the whole feature
 * should come out by deleting this file and its handful of call sites,
 * not by untangling it from unrelated workspace state. */
interface EfficientModeState {
  enabled: boolean;
  toggle: () => void;
}

export const useEfficientModeStore = create<EfficientModeState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    {
      name: "doculens-efficient-mode",
    }
  )
);
