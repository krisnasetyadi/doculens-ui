"use client";

import { useLayoutEffect, type RefObject } from "react";
import { useAnswerStreamStore } from "@/stores/answer-stream-store";
import { ChatMessage, type ChatMessageProps } from "./chat-message";
import { streamingMessage } from "./chat-types";

interface StreamingMessageProps extends Omit<ChatMessageProps, "message" | "streaming"> {
  /** The chat whose answer is written here (the thread's `streamKey`). */
  streamKey: string;
  /** For a regenerate: the message this one is written in place of. */
  replacesId?: string;
  /** The thread's scroll container, and whether its reader is at the bottom. */
  scrollEl: RefObject<HTMLDivElement | null>;
  following: RefObject<boolean>;
}

/** MS-906: the answer that is still being written. It reads its own text from
 * the answer-stream store, which changes on every frame, so that only this
 * bubble is rendered again for a frame and not the whole thread. It also keeps
 * the newest line in view for a reader who is at the bottom. */
export function StreamingMessage({ streamKey, replacesId, scrollEl, following, ...messageProps }: StreamingMessageProps) {
  const live = useAnswerStreamStore((s) => s.streams[streamKey] ?? null);
  const written = live?.text.length ?? 0;

  useLayoutEffect(() => {
    const el = scrollEl.current;
    if (el && written > 0 && following.current) el.scrollTop = el.scrollHeight;
  }, [written, scrollEl, following]);

  return <ChatMessage {...messageProps} message={streamingMessage(live, replacesId)} streaming />;
}
