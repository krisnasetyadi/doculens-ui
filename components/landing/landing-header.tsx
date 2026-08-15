"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";

export function LandingHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.name ?? user?.email ?? "";
  const initials = displayName
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="w-full px-4 sm:px-10 py-4 sm:py-5 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 group">
        <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)] transition-transform group-hover:scale-105">
          <span
            className="material-symbols-outlined text-white text-lg sm:text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            hub
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="font-['Manrope'] text-base sm:text-xl font-extrabold text-primary leading-none truncate">
            DocuLens
          </h1>
          <p className="hidden sm:block font-['Manrope'] text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mt-0.5">
            Enterprise Intelligence
          </p>
        </div>
      </Link>
      <nav className="hidden sm:flex items-center gap-6 font-['Manrope'] text-sm font-semibold text-muted-foreground">
        <a href="#features" className="hover:text-primary transition-colors">
          Features
        </a>
        <a href="#pricing" className="hover:text-primary transition-colors">
          Pricing
        </a>
        <a href="#reviews" className="hover:text-primary transition-colors">
          Reviews
        </a>
      </nav>
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <ThemeToggle />
        {user ? (
          <>
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground font-['Manrope'] font-semibold text-sm">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-primary/15 text-primary font-extrabold text-[10px]">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[140px]">{displayName}</span>
            </div>
            <Button
              onClick={() => router.push("/home")}
              className="group bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold hover:shadow-[0_0_0_6px_rgba(74,124,255,0.15)] hover:-translate-y-0.5 transition-all px-3 sm:px-4 text-sm sm:text-base"
            >
              Go to Workspace
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => router.push("/login")}
              className="hidden sm:inline-flex text-muted-foreground font-['Manrope'] font-semibold hover:text-primary"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push("/register")}
              className="group bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold hover:shadow-[0_0_0_6px_rgba(74,124,255,0.15)] hover:-translate-y-0.5 transition-all px-3 sm:px-4 text-sm sm:text-base"
            >
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
