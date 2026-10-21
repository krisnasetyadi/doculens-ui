import { create } from "zustand";
import { createTypewriter } from "@/lib/typewriter";
import type { QuerySources, QueryStreamHandlers } from "@/services/agnostic/type/query-stream.type";

/** An answer that is still being written (MS-906). Kept apart from the
 * thread's messages on purpose: it is never saved, never counted as a
 * message, and a chat the user has left keeps receiving its own text without
 * touching the one on screen.
 *
 * RULES.md section 6 keeps backend data out of stores. This is the one
 * exception, on purpose: it is an answer still being written, not cached or
 * saved data, and it has to outlive the chat view that asked for it. TanStack
 * Query has no place for text that grows while a request is open. */
export interface StreamingAnswer {
  text: string;
  /** Null until the backend has finished its search. */
  sources: QuerySources | null;
}

interface AnswerStreamState {
  /** By chat: the thread key, or "__unsaved__" for a chat with none (see flightKey). */
  streams: Record<string, StreamingAnswer>;
  begin: (key: string) => void;
  setSources: (key: string, sources: QuerySources) => void;
  appendText: (key: string, text: string) => void;
  end: (key: string) => void;
}

/** Changes the answer of `key` only if it is still being streamed, so a late
 * frame cannot bring back an answer that already ended or was stopped. */
const update =
  (key: string, change: (answer: StreamingAnswer) => StreamingAnswer) =>
  (state: AnswerStreamState) =>
    key in state.streams ? { streams: { ...state.streams, [key]: change(state.streams[key]) } } : state;

export const useAnswerStreamStore = create<AnswerStreamState>()((set) => ({
  streams: {},
  begin: (key) => set((state) => ({ streams: { ...state.streams, [key]: { text: "", sources: null } } })),
  setSources: (key, sources) => set(update(key, (answer) => ({ ...answer, sources }))),
  appendText: (key, text) => set(update(key, (answer) => ({ ...answer, text: answer.text + text }))),
  end: (key) =>
    set((state) => {
      if (!(key in state.streams)) return state;
      const { [key]: _ended, ...rest } = state.streams;
      return { streams: rest };
    }),
}));

/** Starts streaming an answer for the chat `key`. Pass `handlers` to the
 * request. The text that arrives is typed out into the store, at most once per
 * animation frame (see lib/typewriter.ts). When the answer is complete, call
 * `finish`: it resolves once the typing has caught up. An answer that was not
 * streamed (a canned reply, the passage shown when the model fails, a backend
 * that does not stream) has nothing to type, so `finish` resolves at once and
 * the finished answer appears whole, as the ticket asks. Call `end` when the
 * answer is over, however it ended. */
export function beginAnswerStream(key: string): {
  handlers: QueryStreamHandlers;
  finish: () => Promise<void>;
  end: () => void;
} {
  const { begin, setSources, appendText, end } = useAnswerStreamStore.getState();
  begin(key);
  const typewriter = createTypewriter((text) => appendText(key, text));
  return {
    handlers: {
      onSources: (sources: QuerySources) => setSources(key, sources),
      onDelta: (text: string) => typewriter.push(text),
    },
    finish: () => typewriter.finish(),
    end: () => {
      typewriter.cancel();
      end(key);
    },
  };
}
