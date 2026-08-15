"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { navItems, isNavActive } from "@/components/workspace/workspace-nav-items";
import { useAuthStore } from "@/stores/auth-store";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }
  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <WorkspaceSidebar onLogoutClick={() => setLogoutConfirmOpen(true)} />

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button title="Account" aria-label="Account" className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <span className="material-symbols-outlined text-xl">account_circle</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="font-['Manrope'] font-bold truncate">{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground truncate">
                    {user?.email ?? "Not signed in"}
                  </span>
                  <span className="text-xs font-['Manrope'] font-semibold text-primary">
                    {user?.role === "admin" ? "Admin Access" : "Member"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 pt-14 pb-16 lg:pb-0 overflow-hidden h-full">{children}</main>
      </div>

      {/* Shared by both logout entry points (sidebar + header account menu) so
         sign-out always confirms, regardless of which one was clicked. */}
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
