"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, PanelLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavSheet } from "./_components/mobile-nav-sheet";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { SettingsModal } from "@/components/workspace/settings-modal";
import { ChatSearchDialog } from "@/components/workspace/chat-search-dialog";
import { navItems, isNavActive } from "@/components/workspace/workspace-nav-items";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AuthApi } from "@/services/resources/auth-api";
import { paymentsApi } from "@/services/payments/handler/payments.api";
import { useToast } from "@/hooks/use-toast";
import { DIALOG_DESTRUCTIVE_CLASS } from "@/lib/dialog-styles";
import type { AuthUser } from "@/services/types";
import type { TokenRequestsResponse } from "@/services/payments/type/token-request.type";
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

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 264;
const SIDEBAR_TEXT_GAP = 16;
const SIDEBAR_FALLBACK_CLOSE_AT = 200;

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  // MS-388: the bottom tab bar follows the same rule as the sidebar — once
  // a chat session is active the highlight belongs to the conversation, not
  // to the "Workspace" tab.
  const activeSessionId = useWorkspaceStore((s) => s.activeSessionId);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Settings is opened from a DropdownMenuItem (sidebar footer + header
  // account menu). Setting this synchronously inside that same click makes
  // the closing dropdown's Dialog and the opening Settings Dialog overlap
  // for one frame — both are Radix modal layers sharing one global
  // body.style.pointerEvents lock, so the outgoing layer can restore it
  // while the incoming one still expects it, leaving the sidebar's <nav>
  // (which has no pointer-events-auto override) permanently inert (MS-255).
  // Deferring to the next tick lets the dropdown fully unmount first.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Below lg the sidebar is hidden and this sheet takes its place.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavButtonRef = useRef<HTMLButtonElement>(null);

  // The JWT never carries avatar_url (too large to put in a token sent on
  // every request), so hydrate it — and reconcile name/is_active — from the
  // DB once per session instead of trusting only the decoded token.
  useEffect(() => {
    AuthApi.me<AuthUser>()
      .then((profile) => updateUser(profile))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin-only: in-app "notification" for pending token requests (MS-248
  // follow-up) — polled app-wide (not just while Settings is open) so a
  // badge shows up on the sidebar even if the admin never opens Billing,
  // and a toast fires the moment a NEW request arrives while they're
  // active. No real push notification yet (see the polling note in
  // router/payment.py) — this is the in-app version of that.
  const [pendingTokenRequests, setPendingTokenRequests] = useState(0);
  const lastSeenRequestCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const refresh = () => {
      paymentsApi.listTokenRequests()
        .then((res) => {
          const previous = lastSeenRequestCountRef.current;
          if (previous !== null && res.pending_count > previous) {
            const newOnes = res.pending_count - previous;
            toast({
              title: "New token request",
              description: `${newOnes} new request${newOnes === 1 ? "" : "s"} for more tokens — check Settings > Billing.`,
            });
          }
          lastSeenRequestCountRef.current = res.pending_count;
          setPendingTokenRequests(res.pending_count);
        })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [isAdmin, toast]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MAX);
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("sidebar-width"));
      if (saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) setSidebarWidth(saved);
    } catch {}
  }, []);
  // The edge handle resizes down from MAX. The "Document Intelligence" subtitle
  // in the logo row ellipsizes as the sidebar narrows; once the cursor reaches
  // where that text would start to be cut into, the sidebar slides shut.
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const subtitle = document.querySelector<HTMLElement>("[data-sidebar-subtitle]");
    const nav = subtitle?.closest("nav");
    const closeAt = subtitle && nav
      ? subtitle.getBoundingClientRect().left - nav.getBoundingClientRect().left + subtitle.scrollWidth + SIDEBAR_TEXT_GAP
      : SIDEBAR_FALLBACK_CLOSE_AT;
    setResizing(true);
    let width = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setResizing(false);
      try { localStorage.setItem("sidebar-width", String(width)); } catch {}
    };
    const move = (ev: PointerEvent) => {
      if (ev.clientX < closeAt) {
        setSidebarCollapsed(true);
        try { localStorage.setItem("sidebar-collapsed", "1"); } catch {}
        end();
        return;
      }
      width = Math.min(SIDEBAR_MAX, ev.clientX);
      setSidebarWidth(width);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }
  function toggleSidebar() {
    // Reopening always restores the full width, not the size the user dragged to.
    if (sidebarCollapsed) {
      setSidebarWidth(SIDEBAR_MAX);
      try { localStorage.setItem("sidebar-width", String(SIDEBAR_MAX)); } catch {}
    }
    setSidebarCollapsed(!sidebarCollapsed);
    try { localStorage.setItem("sidebar-collapsed", sidebarCollapsed ? "0" : "1"); } catch {}
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={{ "--sbw": `${sidebarCollapsed ? 0 : sidebarWidth}px` } as React.CSSProperties}
    >
      <WorkspaceSidebar
        onSettingsClick={() => setTimeout(() => setSettingsOpen(true), 0)}
        onLogoutClick={() => setLogoutConfirmOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        pendingTokenRequests={pendingTokenRequests}
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
        resizing={resizing}
      />

      {!sidebarCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={startResize}
          style={{ left: sidebarWidth - 3 }}
          className="hidden lg:block fixed top-0 z-[60] h-dvh w-1.5 cursor-col-resize"
        />
      )}

      {/* ── Bottom Tab Bar (mobile only — desktop uses the sidebar above) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around h-16">
          {navItems.map((item) => {
            const isActive = isNavActive(pathname, item.href, !!activeSessionId);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 font-['Manrope'] text-[11px] font-bold transition-colors ${
                  isActive ? "text-primary" : "text-sidebar-foreground/50"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px] leading-none"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Right: Header + Content ───────────────────────── */}
      <div className={`lg:ml-[var(--sbw)] ${resizing ? "" : "transition-[margin] duration-300"} ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none flex-1 flex flex-col min-h-screen overflow-hidden`}>
        <header className={`fixed top-0 left-0 right-0 lg:left-[var(--sbw)] ${resizing ? "" : "transition-[left] duration-300"} ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none h-[61px] max-[620px]:h-[52px] bg-background/80 backdrop-blur-md z-30 flex justify-between items-center px-[clamp(24px,5vw,74px)] max-[900px]:px-6 max-[620px]:px-[17px] border-b border-border/60`}>
          <div className="flex items-center gap-2 min-w-0">
            <button
              ref={mobileNavButtonRef}
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="grid lg:hidden size-10 shrink-0 place-items-center rounded-lg -ml-2.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
            >
              <Menu className="size-5" />
            </button>
            {/* Mobile: brand mark stands in for the sidebar (hidden below lg) */}
            <Link href="/" className="flex items-center gap-2 lg:hidden shrink-0 -ml-1">
              <div className="w-7 h-7 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_3px_rgba(74,124,255,0.15)]">
                <span className="material-symbols-outlined text-white text-base leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                  hub
                </span>
              </div>
              <span className="font-['Manrope'] font-extrabold text-foreground text-sm">DocuLens</span>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              className="hidden lg:grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors lg:-ml-[calc(clamp(24px,5vw,74px)-24px)]"
            >
              <PanelLeft className="size-[18px]" />
            </button>
            {/* Desktop: contextual label (brand already shown in the sidebar) */}
            <span className="hidden lg:inline font-['Manrope'] font-bold text-muted-foreground text-[15px] tracking-tight truncate">Knowledge Workspace</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 pt-[61px] max-[620px]:pt-[52px] pb-16 lg:pb-0 overflow-hidden h-full">{children}</main>
      </div>

      <MobileNavSheet
        triggerRef={mobileNavButtonRef}
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onSettingsClick={() => setSettingsOpen(true)}
        onLogoutClick={() => setLogoutConfirmOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        pendingTokenRequests={pendingTokenRequests}
      />

      {/* Opens as a modal instead of navigating to a /settings page. */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Search across historical chats, opened from the sidebar's logo row (MS-89). */}
      <ChatSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Opened from the sidebar footer — always confirms before signing out. */}
      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to sign in again to access the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className={DIALOG_DESTRUCTIVE_CLASS}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
