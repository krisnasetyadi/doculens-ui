"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Trash2 } from "lucide-react";
import { SessionsApi } from "@/services/resources/sessions-api";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { navItems, isNavActive } from "./workspace-nav-items";
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
}

/** Desktop-only left nav (mobile uses the bottom tab bar in the layout instead). */
export function WorkspaceSidebar({ onSettingsClick, onLogoutClick, onSearchClick }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const cachedSessions = useWorkspaceStore((s) => s.cachedSessions);
  const setCachedSessions = useWorkspaceStore((s) => s.setCachedSessions);
  const sessionsVersion = useWorkspaceStore((s) => s.sessionsVersion);
  const bumpSessionsVersion = useWorkspaceStore((s) => s.bumpSessionsVersion);
  const activeSessionId = useWorkspaceStore((s) => s.activeSessionId);

  // Seeded from the cache so the list doesn't flash empty on every
  // navigation — only re-fetched below when sessionsVersion is bumped
  // (a conversation was created or deleted), not on route changes.
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>(() => cachedSessions);
  const [sessionsLoading, setSessionsLoading] = useState(cachedSessions.length === 0);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string } | null>(null);

  const displayName = user?.name ?? user?.email ?? "User";
  const initials = getInitials(displayName);

  useEffect(() => {
    SessionsApi.get<{ session_id: string; title: string }[]>()
      .then((data) => {
        const mapped = data.map((s) => ({ id: s.session_id, title: s.title }));
        setSessions(mapped);
        setCachedSessions(mapped);
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
      window.location.pathname === "/ask" && activeSessionId === target.id;
    const next = sessions.filter((s) => s.id !== target.id);
    setSessions(next);
    setCachedSessions(next);
    SessionsApi.delete(target.id)
      .then(() => {
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
        setSessions((prev) => (prev.some((s) => s.id === target.id) ? prev : [...prev, target]));
        toast({
          title: "Couldn't delete conversation",
          description: `"${target.title}" is still there — check your connection and try again.`,
          variant: "destructive",
        });
      });
  };

  return (
    <nav className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col z-50 pointer-events-auto">
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
          const isActive = isNavActive(pathname, item.href);
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
            {sessions.map((s) => (
              <div
                key={s.id}
                className="group relative flex items-center rounded-xl hover:bg-sidebar-accent transition-colors"
              >
                <button
                  onClick={() => router.push(`/ask?session_id=${s.id}`)}
                  className="flex-1 min-w-0 text-left px-2 py-1.5 text-xs font-['Inter'] text-sidebar-foreground/50 group-hover:text-sidebar-foreground truncate"
                  title={s.title}
                >
                  {s.title}
                </button>
                <DropdownMenu>
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
                  >
                    <DropdownMenuItem
                      variant="destructive"
                      className="rounded-lg font-['Manrope'] font-semibold"
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
              </div>
            ))}
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
