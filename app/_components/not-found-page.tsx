"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, House } from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth-token";
import { IconTile } from "@/components/icon-tile";
import { panelVariants } from "@/components/panel";
import { cn } from "@/lib/utils";

interface Destination {
  href: string;
  icon: string;
  title: string;
  description: string;
}

const MEMBER_DESTINATIONS: Destination[] = [
  { href: "/home", icon: "hub", title: "Workspace", description: "Ask questions across your documents." },
  { href: "/sources", icon: "database", title: "Sources", description: "Manage files, databases and chat logs." },
  { href: "/history", icon: "history", title: "History", description: "Pick up a past conversation." },
];

const GUEST_DESTINATIONS: Destination[] = [
  { href: "/#features", icon: "widgets", title: "Features", description: "See what DocuLens can do." },
  { href: "/pricing", icon: "payments", title: "Pricing", description: "Compare plans and limits." },
  { href: "/login", icon: "login", title: "Sign in", description: "Open your workspace." },
];

/** The page for an address that does not exist. It reuses the landing header and
 * footer so it still feels like DocuLens, and offers real next steps. Whether there
 * is a session is only readable in the browser, so the actions stay hidden until
 * mounted instead of flashing the wrong destination. */
export function NotFoundPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setLoggedIn(getAuthToken() !== null);
    setCanGoBack(window.history.length > 1);
  }, []);

  const destinations = loggedIn ? MEMBER_DESTINATIONS : GUEST_DESTINATIONS;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <LandingHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-14 sm:py-20">
        {/* Ambient orbs, same treatment as the landing hero and auth pages */}
        <div className="pointer-events-none fixed right-[12%] top-24 h-64 w-64 rounded-full bg-primary/[0.07] blur-[90px]" />
        <div className="pointer-events-none fixed bottom-20 left-[8%] h-80 w-80 rounded-full bg-primary/[0.05] blur-[110px]" />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center animate-in fade-in-0 duration-500 motion-reduce:animate-none">
          {/* Oversized numerals as texture: fades out so the title can sit on its foot */}
          <span
            aria-hidden
            className="-mb-[0.16em] select-none bg-gradient-to-b from-primary/40 via-primary/15 to-transparent bg-clip-text font-manrope text-[clamp(7rem,26vw,13rem)] font-extrabold leading-[0.85] tracking-tighter text-transparent"
          >
            404
          </span>
          <h1 className="font-manrope text-3xl font-extrabold tracking-tight sm:text-5xl">
            This page doesn&apos;t exist
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            The link may be broken, or the page may have moved. Head back to a place you know, or pick up where you left off below.
          </p>

          <div className={loggedIn === null ? "invisible w-full" : "w-full"}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href={loggedIn ? "/home" : "/"}>
                  <House className="size-3.5" />
                  {loggedIn ? "Go to Home" : "Back to landing page"}
                </Link>
              </Button>
              {canGoBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="size-3.5" />
                  Go back
                </Button>
              )}
            </div>

            <p className="mb-3 mt-14 font-manrope text-[11px] font-extrabold uppercase tracking-[0.15em] text-foreground/50">
              {loggedIn ? "Jump back in" : "Explore DocuLens"}
            </p>
            <ul className="grid w-full gap-3 sm:grid-cols-3">
              {destinations.map((d) => (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    className={cn(panelVariants({ padding: "md" }), "group flex h-full items-start gap-3 text-left transition-colors hover:border-primary/40")}
                  >
                    <IconTile size="lg" tone="primary">
                      <span className="material-symbols-outlined text-[22px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {d.icon}
                      </span>
                    </IconTile>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-manrope text-sm font-bold text-foreground">
                        {d.title}
                        <ArrowUpRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-primary" />
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{d.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
