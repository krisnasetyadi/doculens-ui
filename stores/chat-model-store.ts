import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModelSelection } from "@/services/types";

/** The chat model the user last picked in the composer (MS-1192), kept in this browser so a reload or
 * another chat keeps it. Null until the user picks one: the server's default applies until then.
 * Which model is actually used is decided by chosenModel (features/chat/lib/model-choice.ts). */
interface ChatModelState {
  saved: ModelSelection | null;
  save: (selection: ModelSelection) => void;
}

export const useChatModelStore = create<ChatModelState>()(
  persist(
    (set) => ({
      saved: null,
      save: (selection) => set({ saved: selection }),
    }),
    { name: "doculens-chat-model", version: 1 },
  ),
);
