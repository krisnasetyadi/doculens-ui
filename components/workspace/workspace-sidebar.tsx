"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, Edit, MoreHorizontal, Pin, Search, Share2, Trash2 } from "lucide-react";
import { sessionsApi } from "@/services/sessions/handler/sessions.api";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { DANGER_MENU_COLOR_CLASS } from "@/lib/danger-styles";
import { DeleteConfirmDialog } from "@/app/(workspace)/sources/_components/delete-confirm-dialog";
import { navItems, isNavActive, isChatPathname } from "./workspace-nav-items";

// Chat row menu: sizes measured from the shadcn "card actions with nested share"
// example (card 177px, 3.68px padding, 14px text, 31.1px rows, 7.36px item
// padding and icon gap, 14.75px icons). Colors use the theme tokens, and Delete uses the stock destructive variant.
const CHAT_MENU_ITEM =
  "gap-[7.36px] rounded-xl px-[7.36px] py-[5.52px] text-sm text-[#0A0A0A] focus:bg-accent focus:text-[#0A0A0A] dark:text-foreground dark:focus:text-accent-foreground";
const CHAT_MENU_ICON = "size-[14.75px] text-[#0A0A0A] dark:text-foreground";
const CHAT_MENU_DELETE = `gap-[7.36px] rounded-xl px-[7.36px] py-[5.52px] text-sm ${DANGER_MENU_COLOR_CLASS}`;
import { SidebarProfileMenu } from "./sidebar-profile-menu";

// Pinned chats are kept in this browser only for now (no backend field yet).
const PINNED_CHATS_KEY = "doculens.pinnedChats";

interface WorkspaceSidebarProps {
  /** Opens the shared settings modal owned by the layout — the header's
   * account menu opens the same modal. */
  onSettingsClick: () => void;
  /** Opens the shared sign-out confirmation dialog owned by the layout —
   * the header's account menu triggers the same dialog. */
  onLogoutClick: () => void;
  /** Opens the shared chat-search dialog owned by the layout (MS-89). */
  onSearchClick: () => void;
  /** Pending "request more tokens" asks from the team (MS-248 follow-up,
   * admin-only), polled by the layout. */
  pendingTokenRequests?: number;
  /** Hides the desktop sidebar entirely; the layout owns the toggle. */
  collapsed?: boolean;
  /** Desktop width in px (the layout owns the drag handle). */
  width?: number;
  /** True while the handle is dragged, so the width follows the cursor without easing. */
  resizing?: boolean;
}

/** Desktop-only left nav (mobile uses the bottom tab bar in the layout instead). */
export function WorkspaceSidebar({
  onSettingsClick,
  onLogoutClick,
  onSearchClick,
  pendingTokenRequests,
  collapsed = false,
  width = 264,
  resizing = false,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const cachedSessions = useWorkspaceStore((s) => s.cachedSessions);
  const setCachedSessions = useWorkspaceStore((s) => s.setCachedSessions);
  const sessionsVersion = useWorkspaceStore((s) => s.sessionsVersion);
  const bumpSessionsVersion = useWorkspaceStore((s) => s.bumpSessionsVersion);
  const activeSessionId = useWorkspaceStore((s) => s.activeSessionId);
  const pendingSessions = useWorkspaceStore((s) => s.pendingSessions);
  const dropThread = useWorkspaceStore((s) => s.dropThread);

  // Seeded from the cache so the list doesn't flash empty on every
  // navigation — only re-fetched below when sessionsVersion is bumped
  // (a conversation was created or deleted), not on route changes.
  // Server-confirmed rows only — never a pending draft, see `sessions` below.
  const [baseSessions, setBaseSessions] = useState<{ id: string; title: string }[]>(() => cachedSessions);
  const [sessionsLoading, setSessionsLoading] = useState(cachedSessions.length === 0);
  // MS-388: baseSessions with any still-pending drafts overlaid on top, each
  // keyed by its own current id (a "temp-…" id while pending, the real
  // session_id once created — see reconcilePendingSession) — so several new
  // chats started close together each get their own row instead of fighting
  // over a single slot.
  // MS-388: a chat that started as a draft has to keep the React key it was
  // first rendered with, for the whole browser session — not just while it's
  // in the overlay. Once the draft is reconciled the overlay entry is
  // dropped and the row is served from baseSessions instead, and if that
  // entry keyed by its real id the row would remount right then. Remembering
  // the original key here keeps it identical across both handovers.
  const rowKeysRef = useRef<Map<string, string>>(new Map());
  const sessions = useMemo(() => {
    const pendingList = Object.values(pendingSessions);
    // Idempotent, and derived purely from the entries being rendered.
    for (const p of pendingList) {
      if (!rowKeysRef.current.has(p.id)) rowKeysRef.current.set(p.id, p.clientKey);
    }
    const keyed = (s: { id: string; title: string }) => ({
      ...s,
      rowKey: rowKeysRef.current.get(s.id) ?? s.id,
    });
    if (pendingList.length === 0) return baseSessions.map(keyed);
    // Newest first — Record key order isn't reliable for this: reconciling a
    // draft deletes its temp key and adds a real one, which re-inserts it at
    // the end of insertion order even though the draft itself isn't new.
    pendingList.sort((a, b) => b.createdAt - a.createdAt);
    const pendingIds = new Set(pendingList.map((p) => p.id));
    return [
      ...pendingList.map((p) => ({ id: p.id, title: p.title, rowKey: p.clientKey })),
      ...baseSessions.filter((s) => !pendingIds.has(s.id)).map(keyed),
    ];
  }, [pendingSessions, baseSessions]);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string } | null>(null);
  // Set the instant a Recent item is clicked, before the session actually
  // finishes loading — so the highlight appears immediately instead of
  // lagging behind the network round-trip that sets activeSessionId.
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  // id of the Recent item currently showing an editable title, and the
  // in-progress value of that edit (MS-253).
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  // When rename mode was entered — guards against something elsewhere on
  // the page (e.g. the chat pane finishing a background load) stealing
  // focus and auto-committing the rename before the user has even had a
  // chance to look at it. A real person clicking away never happens this
  // fast, so a blur inside this window gets ignored instead of committed.
  const renameOpenedAtRef = useRef(0);
  // Row whose "..." dropdown is currently open — the menu renders in a
  // portal away from the row, so once the mouse moves onto it the row's own
  // CSS :hover no longer applies. Keeping this in state lets the row hold
  // its hover background for as long as its menu stays open.
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  // Which edge of the "..." the menu lines up with. Normally its top; when that
  // would push it past the bottom of the window, its bottom instead.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PINNED_CHATS_KEY);
      if (raw) setPinnedIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      // Unreadable or blocked storage: start with nothing pinned.
    }
  }, []);
  const togglePin = (id: string) => {
    const next = new Set(pinnedIds);
    const pinned = !next.delete(id);
    if (pinned) next.add(id);
    setPinnedIds(next);
    try {
      window.localStorage.setItem(PINNED_CHATS_KEY, JSON.stringify([...next]));
    } catch {
      // Still pinned for this session; it just won't survive a reload.
    }
    toast({ title: pinned ? "Chat pinned" : "Chat unpinned" });
  };
  // Delays a single click just long enough for a second click to arrive and
  // turn it into a double-click (which cancels the pending navigation and
  // opens rename instead) — the only way to tell the two apart, since the
  // browser always fires two full click events before its own dblclick.
  const titleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (titleClickTimerRef.current) clearTimeout(titleClickTimerRef.current);
    };
  }, []);

  const displayName = user?.name ?? user?.email ?? "User";
  const initials = getInitials(displayName);

  // Focus + select-all so typing immediately replaces the old title.
  // Deferred a tick: the mouseup that finishes the "Rename" click can still
  // land on this input right after it mounts in the same spot, and the
  // browser's native "place cursor at click point" would otherwise collapse
  // the selection we just made. Running after that settles wins the race.
  useEffect(() => {
    if (renamingId) {
      const t = setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [renamingId]);

  const startRename = (s: { id: string; title: string }) => {
    renameOpenedAtRef.current = Date.now();
    setRenamingId(s.id);
    setRenameValue(s.title);
  };

  const handleRenameBlur = () => {
    // Something stole focus within the very first moment of rename mode —
    // not a real user click-away. Reclaim focus instead of committing.
    if (Date.now() - renameOpenedAtRef.current < 300) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
      return;
    }
    commitRename();
  };

  const commitRename = () => {
    if (!renamingId) return;
    const id = renamingId;
    // Rename is only ever reachable on a server-confirmed row (pending
    // drafts hide the rename option), so baseSessions always has it.
    const original = baseSessions.find((s) => s.id === id)?.title ?? "";
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === original) return;
    const previous = baseSessions;
    const next = baseSessions.map((s) => (s.id === id ? { ...s, title: trimmed } : s));
    setBaseSessions(next);
    setCachedSessions(next);
    sessionsApi.rename(id, { title: trimmed }).catch(() => {
      setBaseSessions(previous);
      setCachedSessions(previous);
      toast({
        title: "Couldn't rename conversation",
        description: `Reverted to "${original}".`,
        variant: "destructive",
      });
    });
  };

  // activeSessionId going back to null means the chat view was explicitly
  // reset (e.g. navigated to a bare /ask via the "Workspace" nav item) —
  // clear pendingSessionId too, so a stale click doesn't keep the old item
  // lit after there's no active session left to point at. A fresh temp- id
  // (MS-388: a brand-new chat's first message, e.g. sent from /home) gets
  // the same treatment — it can never be what a leftover pendingSessionId
  // from an earlier row click was pointing at, so there's nothing to race.
  // Only reacting to these two cases (not every activeSessionId change)
  // avoids clobbering a more recent click whose own network response just
  // hasn't landed yet.
  useEffect(() => {
    if (activeSessionId === null || activeSessionId?.startsWith("temp-")) setPendingSessionId(null);
  }, [activeSessionId]);

  useEffect(() => {
    sessionsApi.list()
      .then((data) => {
        const mapped = data.map((s) => ({ id: s.session_id, title: s.title }));
        setCachedSessions(mapped); // persisted cache: server-confirmed rows only
        setBaseSessions(mapped);
        // MS-388: the base list now covers any pending overlay entries it
        // includes — drop those so the map doesn't grow unbounded across a
        // session (each draft's entry would otherwise linger forever once
        // reconciled, even though `sessions` already prefers the overlay and
        // never shows a visible duplicate either way).
        const store = useWorkspaceStore.getState();
        Object.keys(store.pendingSessions).forEach((id) => {
          if (mapped.some((s) => s.id === id)) store.setPendingSession(id, null);
        });
      })
      .catch(() =>
        toast({
          title: "Couldn't load recent conversations",
          description: "Check your connection and try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setSessionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsVersion]);

  // Resolves true once the server has deleted the chat, false if it failed, so
  // the confirm dialog can wait on it and stay open for a retry.
  const handleConfirmDelete = async (): Promise<boolean> => {
    if (!sessionToDelete) return true;
    const target = sessionToDelete;
    // Deleting the session currently open in /ask would otherwise leave the
    // chat view stuck showing data that no longer exists (MS-85 revision).
    const wasActiveSession =
      isChatPathname(window.location.pathname) && activeSessionId === target.id;
    // Delete is only ever reachable on a server-confirmed row (the menu hides it for drafts).
    try {
      await sessionsApi.delete(target.id);
    } catch {
      toast({
        title: "Couldn't delete conversation",
        description: `"${target.title}" is still there. Check your connection and try again.`,
        variant: "destructive",
      });
      return false;
    }
    // Only now does the row leave the list. Functional updates, since the list
    // may have changed (a rename, a refresh) while the request was in flight.
    setBaseSessions((prev) => prev.filter((s) => s.id !== target.id));
    setCachedSessions(useWorkspaceStore.getState().cachedSessions.filter((s) => s.id !== target.id));
    // MS-388: evict the cached thread too, or the deleted conversation
    // would still be restored from cache if that id came back.
    dropThread(target.id);
    bumpSessionsVersion();
    toast({
      title: "Chat deleted",
      description: `"${target.title}" has been removed from your history.`,
      variant: "success",
    });
    // Full reload (not router.push) so the chat view comes back completely
    // clean, with no client-side state to reset.
    if (wasActiveSession) window.location.href = "/ask";
    return true;
  };
  return (
    <nav inert={collapsed} style={{ width }} className={`hidden lg:flex ${resizing ? "" : "transition-transform duration-300"} ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${collapsed ? "-translate-x-full" : "translate-x-0"} lg:fixed lg:left-0 lg:top-0 h-dvh bg-sidebar border-r border-sidebar-border flex-col z-50 pointer-events-auto`}>
      {/* Logo */}
      <div className="pl-6 pr-4 pt-[23px] pb-[25px] flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)] group-hover:shadow-[0_0_0_6px_rgba(74,124,255,0.2)] transition-shadow shrink-0">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-['Manrope'] text-base font-extrabold text-sidebar-foreground leading-none">DocuLens</h1>
            <p data-sidebar-subtitle className="font-['Manrope'] text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground/90 mt-1 whitespace-nowrap truncate">Document Intelligence</p>
          </div>
        </Link>
        <button
          onClick={onSearchClick}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
          title="Search conversations"
          aria-label="Search conversations"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* New Inquiry CTA */}
      <div className="px-4 mb-[26px]">
        <Button
          asChild
          className="w-full h-10 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-pressed text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
        >
          <Link href="/home" className="justify-center">
            <span className="relative">
              <span className="material-symbols-outlined absolute right-full top-1/2 mr-2 -translate-y-1/2 text-base leading-none">add</span>
              New Inquiry
            </span>
          </Link>
        </Button>
      </div>

      {/* Section label */}
      <p className="px-[26px] mb-2 text-[11px] font-extrabold tracking-[0.15em] uppercase text-foreground/50 font-['Manrope']">Workspace</p>

      {/* Nav items */}
      <div className="flex flex-col space-y-0.5 px-4 pt-0.5">
        {navItems.map((item) => {
          const isActive = isNavActive(pathname, item.href, !!activeSessionId);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-[11px] px-[11px] py-2.5 rounded-xl font-['Manrope'] font-bold text-[15px] transition-all w-full group ${
                isActive
                  ? "bg-selected text-primary-pressed dark:text-primary"
                  : "text-[#4d5160] dark:text-muted-foreground hover:bg-foreground/[0.06] hover:text-sidebar-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
              <span
                className="material-symbols-outlined text-xl leading-none"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>

      {/* Recent conversations section */}
      <div className="px-4 mt-5 flex-grow overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-[10px] mb-[7px]">
          <p className="text-[11px] font-extrabold tracking-[0.15em] uppercase text-foreground/50 font-['Manrope']">
            Recent
          </p>
          {sessions.length > 0 && (
            <Link
              href="/history"
              className="px-1 py-1 text-[11px] font-semibold text-primary-hover hover:text-primary-pressed dark:text-primary/80 dark:hover:text-primary transition-colors"
            >
              View all
            </Link>
          )}
        </div>
        {sessionsLoading && sessions.length === 0 ? (
          <div role="status" className="space-y-0.5">
            <span className="sr-only">Loading recent conversations…</span>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-[34px] w-full rounded-xl bg-sidebar-accent/50" aria-hidden="true" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-[10px] py-2 text-[13px] font-['Inter'] text-muted-foreground/70 italic">No conversations yet</p>
        ) : (
          // 2px between rows so a hovered row and the active one don't touch.
          <div className="space-y-0.5">
            {sessions.map((s) => {
              // A fresh click always wins over the still-loading previous
              // session: once pendingSessionId is set, it's the sole source
              // of truth (falls back to activeSessionId only before any
              // click has happened yet, e.g. a direct page load) — so the
              // old item deactivates the instant a new one is clicked,
              // instead of staying lit until the new session finishes.
              // MS-388: isChatPathname, not `=== "/ask"` — a chat started
              // from the Home hero stays on /home, so the old check meant a
              // brand-new conversation never lit up at all.
              //
              // Matching on rowKey as well as id is what removes the last
              // blink: at the moment a draft is reconciled, the row's id and
              // activeSessionId both move from the temp id to the real one,
              // and if those two store writes ever land in separate commits
              // there's a frame where neither matches and the highlight goes
              // dark. Accepting either id means every in-between state still
              // matches, so it can't blink whatever the batching does.
              const marker = pendingSessionId ?? activeSessionId;
              const isActive =
                isChatPathname(pathname) && (marker === s.id || marker === s.rowKey);
              // MS-388: still being created server-side. Navigable (restores
              // from the shared draft) but not renamable/deletable — there's
              // no real session yet for either of those to act on.
              const isPending = s.id.startsWith("temp-");
              return (
              <div
                key={s.rowKey}
                className={`group relative flex items-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-selected"
                    : menuOpenId === s.id || renamingId === s.id
                      ? "bg-foreground/[0.06]"
                      : "hover:bg-foreground/[0.06]"
                }`}
              >
                {renamingId === s.id ? (
                  // No visible box — just the text turned editable, matching
                  // the row's own type size/weight. The browser's native
                  // text-selection highlight (from the .select() call) is
                  // the only affordance that it's now editable.
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setRenamingId(null);
                      }
                    }}
                    className={`flex-1 min-w-0 px-[10px] py-2 text-[13px] leading-[18px] font-['Inter'] text-sidebar-foreground bg-transparent border-none outline-none ${isActive ? "font-medium" : ""}`}
                  />
                ) : (
                  <button
                    onClick={() => {
                      // MS-388: still navigable while pending — useChatThread
                      // restores it from the shared draft (no backend GET
                      // needed yet) and shows the same waiting-for-reply
                      // state as any other in-flight query.
                      if (titleClickTimerRef.current) return;
                      titleClickTimerRef.current = setTimeout(() => {
                        titleClickTimerRef.current = null;
                        setPendingSessionId(s.id);
                        router.push(`/ask?session_id=${s.id}`);
                      }, 220);
                    }}
                    onDoubleClick={() => {
                      // Renaming a not-yet-saved draft would just 404.
                      if (isPending) return;
                      if (titleClickTimerRef.current) {
                        clearTimeout(titleClickTimerRef.current);
                        titleClickTimerRef.current = null;
                      }
                      startRename(s);
                    }}
                    // MS-388: no pending affordance of any kind here — not a
                    // spinner, not a different tooltip. The row has to look
                    // identical before and after the id swap, and a spinner
                    // that disappears also takes its width with it, shunting
                    // the title sideways at exactly the wrong moment.
                    className={`flex-1 min-w-0 text-left px-[10px] py-2 text-[13px] leading-[18px] font-['Inter'] truncate ${
                      isActive
                        ? "font-medium text-primary-pressed dark:text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                    title={s.title}
                  >
                    {s.title}
                  </button>
                )}
                {!isPending && pinnedIds.has(s.id) && (
                  <span className="shrink-0 text-[10px] leading-none text-[#8792a8]" title="Pinned">
                    ◆
                  </span>
                )}
                {!isPending && (
                <DropdownMenu
                  // Controlled by one shared id so only a single row's menu can
                  // be open at a time; a late "closed" from the previous row
                  // must not clear the one that just opened.
                  open={menuOpenId === s.id}
                  onOpenChange={(open) =>
                    setMenuOpenId((current) => (open ? s.id : current === s.id ? null : current))
                  }
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      onClick={(e) => e.stopPropagation()}
                      className="mr-[3px] size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                      size="icon"
                      variant="ghost"
                      title="Chat actions"
                      aria-label="Chat actions"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    // Directly under the ellipsis button with its left edge on the
                    // button's, so the menu extends out to the right, over the
                    // sidebar edge. Radix flips it above the row if there is no
                    // room below, so it never covers its own trigger.
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    collisionPadding={8}
                    className="w-[177px] min-w-0 rounded-2xl border-border bg-popover p-[3.68px]"
                    // Radix returns focus to the "..." trigger by default
                    // once the menu closes — that would steal focus right
                    // back off the rename input we just focused/selected.
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <DropdownMenuItem className={CHAT_MENU_ITEM} onSelect={() => startRename(s)}>
                      <Edit className={CHAT_MENU_ICON} />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className={CHAT_MENU_ITEM} onSelect={() => togglePin(s.id)}>
                      <Pin className={CHAT_MENU_ICON} />
                      {pinnedIds.has(s.id) ? "Unpin chat" : "Pin chat"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="-mx-[3.68px] my-[3.68px] bg-border" />
                    <DropdownMenuItem
                      className={CHAT_MENU_ITEM}
                      // Placeholder until sharing exists.
                      onSelect={() => toast({ title: "Share", description: "Coming soon." })}
                    >
                      <Share2 className={CHAT_MENU_ICON} />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="-mx-[3.68px] my-[3.68px] bg-border" />
                    <DropdownMenuItem
                      className={CHAT_MENU_ITEM}
                      // Placeholder until archiving exists.
                      onSelect={() => toast({ title: "Archive", description: "Coming soon." })}
                    >
                      <Archive className={CHAT_MENU_ICON} />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      className={CHAT_MENU_DELETE}
                      onSelect={(e) => {
                        e.preventDefault();
                        setSessionToDelete(s);
                      }}
                    >
                      <Trash2 className={CHAT_MENU_ICON} />
                      Delete chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <SidebarProfileMenu
        displayName={displayName}
        initials={initials}
        email={user?.email}
        avatarUrl={user?.avatar_url}
        isAdmin={user?.role === "admin"}
        onSettingsClick={onSettingsClick}
        onLogoutClick={onLogoutClick}
        pendingTokenRequests={pendingTokenRequests}
      />

      <DeleteConfirmDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
        title="Delete this chat?"
        description={<>&ldquo;{sessionToDelete?.title}&rdquo; will be permanently deleted. You can&apos;t undo this.</>}
        onConfirm={handleConfirmDelete}
      />
    </nav>
  );
}
