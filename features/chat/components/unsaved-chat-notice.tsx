"use client";

import { RetryNotice } from "@/components/retry-notice";
import { retrySessionSave } from "@/features/chat/lib/session-saver";
import { useWorkspaceStore } from "@/stores/workspace-store";

/** The notice inside the open chat when its latest messages are not saved yet. The messages stay on
 * screen and the saver keeps retrying; this is only what tells the user, once however many attempts fail. */
export function UnsavedChatNotice() {
  const activeSessionId = useWorkspaceStore((s) => s.activeSessionId);
  const unsaved = useWorkspaceStore((s) => (s.activeSessionId ? s.unsavedSessions[s.activeSessionId] : undefined));
  if (!activeSessionId || !unsaved) return null;

  return (
    <RetryNotice size="sm" onRetry={() => retrySessionSave(activeSessionId)} retrying={unsaved.retrying}>
      Your latest messages are not saved yet. They stay on screen, and we keep trying.
    </RetryNotice>
  );
}
