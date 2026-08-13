"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionsApi } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/ask", label: "Workspace", icon: "hub" },
  { href: "/sources", label: "Sources", icon: "database" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isNavActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  if (href === "/ask" && pathname === "/home") return true;
  return false;
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  function handleLogout() {
    logout();
    router.push("/login");
  }
  const displayName = user?.name ?? user?.email ?? "User";
  const initials = displayName
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    setSessionsLoading(true);
    SessionsApi.get<{ session_id: string; title: string }[]>()
      .then((data) =>
        setSessions(data.map((s) => ({ id: s.session_id, title: s.title })))
      )
      .catch(() =>
        toast({
          title: "Couldn't load recent conversations",
          description: "Check your connection and try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setSessionsLoading(false));
  }, [pathname, toast]); // refresh whenever the page changes

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Left Nav Sidebar (desktop only — mobile uses the bottom tab bar) ── */}
      <nav className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col z-50">
        {/* Logo */}
        <Link href="/" className="px-5 py-5 flex items-center gap-3 group">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)] group-hover:shadow-[0_0_0_6px_rgba(74,124,255,0.2)] transition-shadow">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
          <div>
            <h1 className="font-['Manrope'] text-base font-extrabold text-sidebar-foreground leading-none">DocuLens</h1>
            <p className="font-['Manrope'] text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 mt-0.5">Enterprise Intelligence</p>
          </div>
        </Link>

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
        <div className="px-3 mt-4 flex-grow overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/40 font-['Manrope'] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm leading-none">history</span>
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
          {sessionsLoading ? (
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
                <button
                  key={s.id}
                  onClick={() => router.push(`/ask?session_id=${s.id}`)}
                  className="w-full text-left px-2 py-1.5 rounded-xl text-xs font-['Inter'] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors truncate block"
                  title={s.title}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom user section */}
        <div className="border-t border-sidebar-border p-4 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-primary/15 text-primary font-extrabold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-sidebar-foreground truncate">{displayName}</span>
              <span className="text-[10px] text-primary">
                {user?.role === "admin" ? "Admin Access" : "Member"}
              </span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  title="Sign out"
                  aria-label="Sign out"
                  className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none">logout</span>
                </button>
              </AlertDialogTrigger>
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
        </div>
      </nav>

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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 pt-14 pb-16 lg:pb-0 overflow-hidden h-full">{children}</main>
      </div>
    </div>
  );
}
