"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { SessionsApi } from "@/services/resources/sessions-api";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { navItems, isNavActive, isChatPathname } from "./workspace-nav-items";
import { SidebarProfileMenu } from "./sidebar-profile-menu";

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
}

/** Desktop-only left nav (mobile uses the bottom tab bar in the layout instead). */
export function WorkspaceSidebar({
  onSettingsClick,
  onLogoutClick,
  onSearchClick,
  pendingTokenRequests,
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
    SessionsApi.update(id, { title: trimmed }).catch(() => {
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
    SessionsApi.get<{ session_id: string; title: string }[]>()
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

  const handleConfirmDelete = () => {
    if (!sessionToDelete) return;
    const target = sessionToDelete;
    setSessionToDelete(null);
    // Deleting the session currently open in /ask would otherwise leave the
    // chat view stuck showing data that no longer exists (MS-85 revision).
    const wasActiveSession =
      isChatPathname(window.location.pathname) && activeSessionId === target.id;
    // Delete is only ever reachable on a server-confirmed row, same as rename.
    const next = baseSessions.filter((s) => s.id !== target.id);
    setBaseSessions(next);
    setCachedSessions(next);
    SessionsApi.delete(target.id)
      .then(() => {
        // MS-388: evict the cached thread too, or the deleted conversation
        // would still be restored from cache if that id came back.
        dropThread(target.id);
        bumpSessionsVersion();
        toast({
          title: "Chat deleted",
          description: `"${target.title}" has been removed from your history.`,
          variant: "success",
        });
        // Full reload (not router.push) so the chat view comes back
        // completely clean — no client-side state to worry about resetting.
        if (wasActiveSession) window.location.href = "/ask";
      })
      .catch(() => {
        setBaseSessions((prev) => (prev.some((s) => s.id === target.id) ? prev : [...prev, target]));
        toast({
          title: "Couldn't delete conversation",
          description: `"${target.title}" is still there — check your connection and try again.`,
          variant: "destructive",
        });
      });
  };

  return (
    <nav className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 h-dvh w-64 bg-sidebar border-r border-sidebar-border flex-col z-50 pointer-events-auto">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)] group-hover:shadow-[0_0_0_6px_rgba(74,124,255,0.2)] transition-shadow shrink-0">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-['Manrope'] text-base font-extrabold text-sidebar-foreground leading-none">DocuLens</h1>
            <p className="font-['Manrope'] text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 mt-0.5">Document Intelligence</p>
          </div>
        </Link>
        <button
          onClick={onSearchClick}
          className="shrink-0 p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Search conversations"
          aria-label="Search conversations"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* New Inquiry CTA */}
      <div className="px-4 mb-4">
        <Button
          asChild
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
        >
          <Link href="/home">
            <span className="material-symbols-outlined text-base leading-none">add</span>
            New Inquiry
          </Link>
        </Button>
      </div>

      {/* Section label */}
      <p className="px-6 mb-2 text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50 font-['Manrope']">Workspace</p>

      {/* Nav items */}
      <div className="flex flex-col space-y-0.5 px-3">
        {navItems.map((item) => {
          const isActive = isNavActive(pathname, item.href, !!activeSessionId);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-['Manrope'] font-bold text-sm transition-all w-full group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
      <div className="px-3 mt-4 flex-grow overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-3 mb-1.5">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/50 font-['Manrope']">
            Recent
          </p>
          {sessions.length > 0 && (
            <Link
              href="/history"
              className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary/70 hover:text-primary transition-colors"
            >
              View all
            </Link>
          )}
        </div>
        {sessionsLoading && sessions.length === 0 ? (
          <div className="space-y-0.5 px-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 rounded-xl bg-sidebar-accent/50 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-2 text-xs font-['Inter'] text-muted-foreground/30 italic">No conversations yet</p>
        ) : (
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
                    ? "bg-primary/10"
                    : menuOpenId === s.id || renamingId === s.id
                      ? "bg-sidebar-accent"
                      : "hover:bg-sidebar-accent"
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
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs font-['Inter'] text-sidebar-foreground bg-transparent border-none outline-none"
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
                    className={`flex-1 min-w-0 text-left px-2 py-1.5 text-xs font-['Inter'] truncate ${
                      isActive
                        ? "text-primary font-semibold"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    }`}
                    title={s.title}
                  >
                    {s.title}
                  </button>
                )}
                {!isPending && (
                <DropdownMenu onOpenChange={(open) => setMenuOpenId(open ? s.id : null)}>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 mr-1 p-1 rounded-md text-sidebar-foreground/40 opacity-0 group-hover:opacity-100 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[state=open]:opacity-100 transition-opacity"
                      title="Chat actions"
                      aria-label="Chat actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[9rem] rounded-xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
                    // Radix returns focus to the "..." trigger by default
                    // once the menu closes — that would steal focus right
                    // back off the rename input we just focused/selected.
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <DropdownMenuItem
                      // text-xs to match the Recent list's own font size —
                      // shadcn's default (text-sm) reads oversized sitting
                      // right next to the 12px titles it's acting on.
                      className="rounded-lg font-['Manrope'] font-normal text-xs focus:bg-muted"
                      onSelect={() => startRename(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      // Same neutral hover as every other item (ChatGPT/
                      // Gemini/Claude do this too) — only the text stays
                      // red, the background doesn't switch to a second,
                      // unrelated accent color just because it's Delete.
                      className="rounded-lg font-['Manrope'] font-normal text-xs focus:bg-muted data-[variant=destructive]:focus:bg-muted dark:data-[variant=destructive]:focus:bg-muted"
                      onSelect={(e) => {
                        e.preventDefault();
                        setSessionToDelete(s);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
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

      <AlertDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Manrope'] font-extrabold">Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription className="font-['Inter']">
              &ldquo;{sessionToDelete?.title}&rdquo; will be permanently deleted. You can&apos;t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
