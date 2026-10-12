"use client";

import { RetryNotice } from "@/components/retry-notice";
import { retrySessionSave } from "@/features/chat/lib/session-saver";
import { useWorkspaceStore } from "@/stores/workspace-store";

/** The same notice for a chat that is no longer on screen, so it names the chat. The chat that is on
 * screen shows its own notice in the composer area instead (UnsavedChatNotice). Sits just under the
 * header, and only its notices take clicks. */
export function UnsavedChatsBanner() {
  const activeSessionId = useWorkspaceStore((s) => s.activeSessionId);
  const unsavedSessions = useWorkspaceStore((s) => s.unsavedSessions);
  const sessions = useWorkspaceStore((s) => s.cachedSessions);
  const offScreen = Object.entries(unsavedSessions).filter(([id]) => id !== activeSessionId);
  if (offScreen.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[61px] z-20 flex flex-col items-center gap-2 px-4 pt-2 max-[620px]:top-[52px] lg:left-[var(--sbw)]">
      {offScreen.map(([id, unsaved]) => (
        <RetryNotice
          key={id}
          size="sm"
          className="pointer-events-auto max-w-xl"
          onRetry={() => retrySessionSave(id)}
          retrying={unsaved.retrying}
        >
          {/* The title the sidebar shows. The saver's own title is only a fallback: for a chat that already
              exists it is derived from the messages loaded so far, and the server never uses it. */}
          &ldquo;{sessions.find((s) => s.id === id)?.title ?? unsaved.title}&rdquo; is not saved yet. We keep trying.
        </RetryNotice>
      ))}
    </div>
  );
}
