"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/ask", label: "Ask", icon: "chat_bubble" },
  { href: "/sources", label: "Sources", icon: "database" },
  { href: "/history", label: "History", icon: "history" },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f9fb]">
      {/* ── Left Nav Sidebar ─────────────────────────────── */}
      <nav className="h-screen w-64 fixed left-0 top-0 bg-[#cfdce3] flex flex-col p-4 z-50">
        <Link href="/" className="px-3 py-6 mb-2 block group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0053db] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">
                hub
              </span>
            </div>
            <div>
              <h1 className="font-['Manrope'] text-lg font-extrabold text-[#1E3A8A] leading-none">
                DocuLens
              </h1>
              <p className="font-['Manrope'] text-[10px] font-semibold tracking-widest uppercase text-[#455367]/70 mt-0.5">
                Enterprise Intelligence
              </p>
            </div>
          </div>
        </Link>

        <Button
          asChild
          className="mb-4 w-full bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-bold gap-2"
        >
          <Link href="/ask">
            <span className="material-symbols-outlined text-base leading-none">
              add
            </span>
            New Inquiry
          </Link>
        </Button>

        <div className="flex flex-col space-y-0.5 flex-grow overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-['Manrope'] font-semibold text-sm transition-all w-full ${
                  isActive
                    ? "bg-[#dbe1ff] text-[#1E3A8A]"
                    : "text-[#455367] hover:bg-[#e1e9ee]"
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl leading-none"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-[#a9b4b9]/30 pt-4">
          <div className="px-3 py-2 flex items-center gap-3 mb-1">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-[#dbe1ff] text-[#0053db] font-bold text-xs">
                SA
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#2a3439] truncate">
                Sarah Adams
              </span>
              <span className="text-[10px] text-[#0053db] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0053db] inline-block" />
                Admin Access
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            asChild
            className="w-full justify-start gap-3 font-['Manrope'] font-semibold text-sm text-[#455367] hover:bg-[#e1e9ee] hover:text-[#455367] px-3"
          >
            <Link href="/settings">
              <span className="material-symbols-outlined text-xl leading-none">
                settings
              </span>
              Settings
            </Link>
          </Button>
        </div>
      </nav>

      {/* ── Right: Header + Content ───────────────────────── */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-[#f7f9fb]/80 backdrop-blur-md z-40 flex justify-between items-center px-8 border-b border-[#d9e4ea]/60">
          <span className="font-['Manrope'] font-bold text-[#566166] text-sm tracking-tight">
            Knowledge Workspace
          </span>
          <div className="flex items-center gap-5">
            <span className="material-symbols-outlined text-[#526074] hover:text-[#1E3A8A] cursor-pointer transition-colors">
              notifications
            </span>
            <span className="material-symbols-outlined text-[#526074] hover:text-[#1E3A8A] cursor-pointer transition-colors">
              help
            </span>
            <span className="material-symbols-outlined text-[#526074] hover:text-[#1E3A8A] cursor-pointer transition-colors">
              account_circle
            </span>
          </div>
        </header>

        <main className="flex-1 pt-16 overflow-hidden h-full">{children}</main>
      </div>
    </div>
  );
}
