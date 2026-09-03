"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { SettingsModal } from "@/components/workspace/settings-modal";
import { ChatSearchDialog } from "@/components/workspace/chat-search-dialog";
import { navItems, isNavActive } from "@/components/workspace/workspace-nav-items";
import { useAuthStore } from "@/stores/auth-store";
import { AuthApi } from "@/services/resources/auth-api";
import { PaymentApi } from "@/services/resources/payment-api";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser, TokenRequestsResponse } from "@/services/types";
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

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
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
      PaymentApi.listTokenRequests<TokenRequestsResponse>()
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

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <WorkspaceSidebar
        onSettingsClick={() => setTimeout(() => setSettingsOpen(true), 0)}
        onLogoutClick={() => setLogoutConfirmOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        pendingTokenRequests={pendingTokenRequests}
      />

      {/* ── Bottom Tab Bar (mobile only — desktop uses the sidebar above) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around h-16">
          {navItems.map((item) => {
            const isActive = isNavActive(pathname, item.href);
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
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="fixed top-0 left-0 right-0 lg:left-64 h-14 bg-background/80 backdrop-blur-md z-30 flex justify-between items-center px-4 sm:px-8 border-b border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile: brand mark stands in for the sidebar (hidden below lg) */}
            <Link href="/" className="flex items-center gap-2 lg:hidden shrink-0 -ml-1">
              <div className="w-7 h-7 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_3px_rgba(74,124,255,0.15)]">
                <span className="material-symbols-outlined text-white text-base leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                  hub
                </span>
              </div>
              <span className="font-['Manrope'] font-extrabold text-foreground text-sm">DocuLens</span>
            </Link>
            {/* Desktop: contextual label (brand already shown in the sidebar) */}
            <span className="hidden lg:inline font-['Manrope'] font-bold text-foreground/60 text-sm tracking-tight truncate">Knowledge Workspace</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 pt-14 pb-16 lg:pb-0 overflow-hidden h-full">{children}</main>
      </div>

      {/* Opens as a modal instead of navigating to a /settings page. */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Search across historical chats, opened from the sidebar's logo row (MS-89). */}
      <ChatSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Opened from the sidebar footer — always confirms before signing out. */}
      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Manrope'] font-extrabold">Sign out?</AlertDialogTitle>
            <AlertDialogDescription className="font-['Inter']">
              You&apos;ll need to sign in again to access the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
