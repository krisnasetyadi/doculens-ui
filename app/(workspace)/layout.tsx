"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionsApi } from "@/services";

const navItems = [
  { href: "/ask", label: "Ask", icon: "chat_bubble" },
  { href: "/sources", label: "Sources", icon: "database" },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    SessionsApi.get<{ session_id: string; title: string }[]>()
      .then((data) =>
        setSessions(data.map((s) => ({ id: s.session_id, title: s.title })))
      )
      .catch(() => {});
  }, [pathname]); // refresh whenever the page changes

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Left Nav Sidebar ─────────────────────────────── */}
      <nav className="h-screen w-64 fixed left-0 top-0 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_16px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_20px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
          >
            <Link href="/home">
              <span className="material-symbols-outlined text-base leading-none">add</span>
              New Inquiry
            </Link>
          </Button>
        </div>

        {/* Section label */}
        <p className="px-5 mb-2 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50 font-['Manrope']">Workspace</p>

        {/* Nav items */}
        <div className="flex flex-col space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              (item.href === "/ask" && pathname === "/home");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-['Manrope'] font-semibold text-sm transition-all w-full group ${
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

        {/* History section */}
        <div className="px-3 mt-4 flex-grow overflow-y-auto">
          <p className="px-2 mb-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/40 font-['Manrope'] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm leading-none">history</span>
            History
          </p>
          {sessions.length === 0 ? (
            <p className="px-2 py-2 text-xs font-['Inter'] text-muted-foreground/30 italic">No conversations yet</p>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/ask?session_id=${s.id}`)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-['Inter'] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors truncate block"
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
              <AvatarFallback className="bg-primary/15 text-primary font-extrabold text-xs">SA</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-sidebar-foreground truncate">Sarah Adams</span>
              <span className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
                Admin Access
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            asChild
            className="w-full justify-start gap-3 font-['Manrope'] font-semibold text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground px-3"
          >
            <Link href="/settings">
              <span className="material-symbols-outlined text-xl leading-none">settings</span>
              Settings
            </Link>
          </Button>
        </div>
      </nav>

      {/* ── Right: Header + Content ───────────────────────── */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-14 bg-background/80 backdrop-blur-md z-40 flex justify-between items-center px-8 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-['Manrope'] font-bold text-foreground/60 text-sm tracking-tight">Knowledge Workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <span className="material-symbols-outlined text-xl">help</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <span className="material-symbols-outlined text-xl">account_circle</span>
            </button>
          </div>
        </header>

        <main className="flex-1 pt-14 overflow-hidden h-full">{children}</main>
      </div>
    </div>
  );
}
