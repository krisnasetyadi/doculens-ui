"use client";

import { useEffect, useRef, useState } from "react";

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
  return (
    <section className="py-16 relative overflow-hidden">
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
  );
}
