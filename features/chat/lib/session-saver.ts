import { sessionsApi } from "@/services/sessions/handler/sessions.api";
import type { UpsertSessionRequest } from "@/services/sessions/type/session.type";
import { useWorkspaceStore } from "@/stores/workspace-store";

// Waits before the 1st, 2nd and every later automatic retry.
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

interface SaveState {
  /** The newest payload not yet confirmed saved. Every save carries the whole thread, so a newer one
   * replaces an older one instead of queueing behind it. */
  latest: UpsertSessionRequest;
  title: string;
  inFlight: boolean;
  failures: number;
  timer: ReturnType<typeof setTimeout> | null;
}

// Module state, not React state: a save has to keep retrying after the chat screen is gone, which is
// exactly when the user most needs to be told it has not been saved.
const saves = new Map<string, SaveState>();

/** A 4xx other than "timed out" and "too many requests" means the request itself is refused (no access,
 * expired login), so sending it again cannot succeed. */
function isPermanentFailure(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function markUnsaved(sessionId: string, title: string, retrying: boolean) {
  useWorkspaceStore.getState().setUnsavedSession(sessionId, { title, retrying });
}

function send(sessionId: string) {
  const state = saves.get(sessionId);
  if (!state) return;
  const sent = state.latest;
  state.inFlight = true;
  state.timer = null;
  // Only a retry has a notice to update; a first attempt shows nothing until it fails.
  if (state.failures > 0) markUnsaved(sessionId, state.title, true);

  sessionsApi.upsert(sent).then(
    () => {
      const current = saves.get(sessionId);
      if (!current) return; // discarded while in flight
      current.inFlight = false;
      if (current.latest !== sent) {
        // A newer save arrived meanwhile; it carries the whole thread, so send it and nothing else.
        current.failures = 0;
        send(sessionId);
        return;
      }
      saves.delete(sessionId);
      useWorkspaceStore.getState().setUnsavedSession(sessionId, null);
    },
    (error: unknown) => {
      const current = saves.get(sessionId);
      if (!current) return;
      current.inFlight = false;
      if (current.latest !== sent) {
        send(sessionId);
        return;
      }
      current.failures += 1;
      markUnsaved(sessionId, current.title, false);
      // After a permanent failure only the user's Retry tries again.
      if (isPermanentFailure(error)) return;
      const delay = RETRY_DELAYS_MS[Math.min(current.failures - 1, RETRY_DELAYS_MS.length - 1)];
      current.timer = setTimeout(() => send(sessionId), delay);
    },
  );
}

/** Saves a chat's messages to a session that already exists. A failure keeps the payload and retries on
 * its own, and the chat shows up in `unsavedSessions` until a save goes through. */
export function saveSessionMessages(sessionId: string, payload: UpsertSessionRequest, title: string) {
  const existing = saves.get(sessionId);
  if (existing) {
    existing.latest = payload;
    existing.title = title;
    // Saving anew right away is better than waiting out a retry timer for an older payload.
    if (existing.timer) {
      clearTimeout(existing.timer);
      existing.timer = null;
    }
    if (!existing.inFlight) send(sessionId);
    return;
  }
  saves.set(sessionId, { latest: payload, title, inFlight: false, failures: 0, timer: null });
  send(sessionId);
}

/** The Retry button: tries again now instead of waiting for the timer, or after a permanent failure. */
export function retrySessionSave(sessionId: string) {
  const state = saves.get(sessionId);
  if (!state || state.inFlight) return;
  if (state.timer) clearTimeout(state.timer);
  send(sessionId);
}

/** Drops a pending save without sending it. The server creates the session when it is missing, so
 * retrying a save after the chat was deleted would bring the deleted chat back. */
export function discardSessionSave(sessionId: string) {
  const state = saves.get(sessionId);
  if (state?.timer) clearTimeout(state.timer);
  saves.delete(sessionId);
  useWorkspaceStore.getState().setUnsavedSession(sessionId, null);
}

/** Drops every pending save, for logout. They belong to the user who is leaving: the page is not reloaded
 * on a menu logout, so without this they would keep retrying, and keep showing, for whoever signs in next. */
export function discardAllSessionSaves() {
  [...saves.keys()].forEach(discardSessionSave);
}
