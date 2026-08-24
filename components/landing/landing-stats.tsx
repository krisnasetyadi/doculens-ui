"use client";

import { useEffect, useRef, useState } from "react";

// ── Entrance progress (0 → 1 as the section's top travels from the bottom
// of the viewport to the top) — drives the "sliding card" lift/scale and the
// rim-light glow that sells the cover-reveal motion against the fixed hero.
function useEnterProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const el = ref.current;
      ticking = false;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.innerHeight;
      setProgress(Math.min(Math.max(1 - top / vh, 0), 1));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);

  return progress;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            setCount(Math.floor(p * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const DIVIDERS = [
  "border-r border-b sm:border-b-0 border-border/60 dark:border-white/10",
  "border-b sm:border-b-0 sm:border-r border-border/60 dark:border-white/10",
  "border-r border-border/60 dark:border-white/10",
  "",
];

function StatItem({
  value,
  label,
  sublabel,
  numeric,
  suffix = "",
  divider,
}: {
  value: string;
  label: string;
  sublabel?: string;
  numeric?: number;
  suffix?: string;
  divider: string;
}) {
  const { count, ref } = useCountUp(numeric ?? 0);
  return (
    <div ref={ref} className={`flex flex-col items-center text-center py-6 px-4 sm:px-6 ${divider}`}>
      <span className="w-6 h-[3px] rounded-full bg-primary/70 mb-3" />
      <p className="font-['Manrope'] text-4xl sm:text-5xl font-extrabold text-foreground dark:text-white tabular-nums leading-none">
        {numeric !== undefined ? `${count}${suffix}` : value}
      </p>
      <p className="font-['Manrope'] text-xs text-muted-foreground dark:text-white/50 mt-3 uppercase tracking-widest">{label}</p>
      {sublabel && (
        <p className="font-['Inter'] text-[10px] text-muted-foreground/50 dark:text-white/30 mt-1 normal-case tracking-normal">{sublabel}</p>
      )}
    </div>
  );
}

export function LandingStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const enterP = useEnterProgress(sectionRef);

  return (
    // Plain solid backer, same footprint as the rounded section below — the
    // section's own rounded-top corners clip its background away entirely at
    // the two top corners, which would otherwise let the fixed hero behind
    // show through. This backer fills that corner cutout with solid color.
    // (Kept un-animated so the hero can never peek through it.)
    <div className="relative z-10 bg-background">
      {/* Natural (not full-viewport) height — LandingFeatures right after this
          also carries an opaque bg now, so hero coverage doesn't depend on
          this card alone being taller than the viewport.
          The lift/scale below is transform-only — opacity stays untouched
          so the opaque cover never lets the hero bleed through. */}
      <section
        ref={sectionRef}
        className="py-24 relative overflow-hidden rounded-t-[2.5rem] shadow-[0_-24px_60px_rgba(0,0,0,0.12)] bg-background will-change-transform"
        style={{ transform: `translateY(${(1 - enterP) * 28}px) scale(${0.97 + enterP * 0.03})` }}
      >
        {/* Rim light — a bright seam right at the rounded top edge, plus a
            softer glow beneath it. Ramps in fast (enterP^0.5) so it's already
            near full strength while the card is still arriving, since the
            broad gradient alone got lost against this section's own dark
            background and glow orbs. */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-primary pointer-events-none"
          style={{ opacity: Math.sqrt(enterP), boxShadow: "0 0 24px 1px rgba(74,124,255,0.8)" }}
        />
        <div
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/40 to-transparent pointer-events-none"
          style={{ opacity: Math.sqrt(enterP) }}
        />
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/40 to-background dark:via-[#060d22]" />
        {/* Glow orbs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-64 rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-[100px] pointer-events-none" />
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/10 dark:bg-primary/20 blur-[80px] pointer-events-none" />
        <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/10 dark:bg-primary/15 blur-[60px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="text-center text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary/70 mb-8">By the numbers</p>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <StatItem value="4+" label="Source Types" numeric={4} suffix="+" divider={DIVIDERS[0]} />
            <StatItem
              value="100%"
              label="Relevant Results"
              sublabel="Precision@K"
              numeric={100}
              suffix="%"
              divider={DIVIDERS[1]}
            />
            <StatItem value="2-5s" label="Cold-Start Response" divider={DIVIDERS[2]} />
            <StatItem
              value="100%"
              label="Always Top-Ranked"
              sublabel="Mean Reciprocal Rank"
              numeric={100}
              suffix="%"
              divider={DIVIDERS[3]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
