"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  const router = useRouter();

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Page background bleeds through */}
      <div className="absolute inset-0 bg-background" />
      {/* Ambient glow blobs */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute left-[15%] top-[20%] w-48 h-48 rounded-full bg-primary/10 blur-[70px] pointer-events-none" />
      <div className="absolute right-[10%] bottom-[10%] w-56 h-56 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

      {/* Glass card */}
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="rounded-3xl border border-primary/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_60px_rgba(74,124,255,0.15)] dark:shadow-[0_8px_60px_rgba(74,124,255,0.2)] p-8 sm:p-12 text-center">
          {/* Top badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-4 py-1.5 rounded-full mb-8 font-['Manrope'] tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
            Ready when you are
          </div>

          <h3 className="font-['Manrope'] text-4xl sm:text-5xl font-extrabold text-foreground mb-4 leading-tight">
            Your knowledge is waiting
            <br />
            <span className="text-primary">to be asked.</span>
          </h3>
          <p className="text-muted-foreground mb-10 font-['Inter'] text-lg max-w-md mx-auto">
            Start in seconds. No setup required.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/40 blur-md animate-pulse scale-105" />
              <Button
                onClick={() => router.push("/home")}
                size="lg"
                className="relative bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-extrabold text-base px-10 shadow-[0_8px_32px_rgba(74,124,255,0.4)] hover:-translate-y-0.5 transition-all"
              >
                Launch DocuLens →
              </Button>
            </div>
            <Button
              onClick={() => router.push("/home")}
              size="lg"
              variant="outline"
              className="border-primary/30 text-primary font-['Manrope'] font-semibold hover:bg-primary/10 bg-transparent"
            >
              Learn more
            </Button>
          </div>

          {/* Subtle divider + trust note */}
          <div className="mt-10 pt-8 border-t border-border/50 flex items-center justify-center gap-6 flex-wrap">
            {["100% Relevant Results", "4+ Source Types", "Real-Time Indexing"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground font-['Inter']">
                <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
