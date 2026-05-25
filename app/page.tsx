"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

// ── Typewriter cycling through source types ───────────────────────────────
const CYCLE_WORDS = ["PDFs", "databases", "chat logs", "your knowledge"];

function useTypewriter(words: string[], speed = 80, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          setDisplay(current.slice(0, charIdx + 1));
          if (charIdx + 1 === current.length) {
            setTimeout(() => setDeleting(true), pause);
          } else {
            setCharIdx((c) => c + 1);
          }
        } else {
          setDisplay(current.slice(0, charIdx - 1));
          if (charIdx - 1 === 0) {
            setDeleting(false);
            setCharIdx(0);
            setWordIdx((w) => (w + 1) % words.length);
          } else {
            setCharIdx((c) => c - 1);
          }
        }
      },
      deleting ? speed / 2 : speed,
    );
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

// ── Count-up on scroll ────────────────────────────────────────────────────
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

// ── Spotlight card (mouse-tracking glow) ─────────────────────────────────
function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [inside, setInside] = useState(false);

  const handleMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setInside(true)}
      onMouseLeave={() => setInside(false)}
      className={`relative overflow-hidden rounded-2xl border border-border bg-card transition-transform duration-200 hover:-translate-y-1 ${className}`}
      style={{
        boxShadow: inside
          ? "0 20px 48px rgba(74,124,255,0.12)"
          : "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      {inside && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, rgba(74,124,255,0.08), transparent 70%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── Stat item with count-up ───────────────────────────────────────────────
function StatItem({
  value,
  label,
  numeric,
  suffix = "",
  icon,
}: {
  value: string;
  label: string;
  numeric?: number;
  suffix?: string;
  icon: string;
}) {
  const { count, ref } = useCountUp(numeric ?? 0);
  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-border shadow-sm dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-sm hover:shadow-md dark:hover:bg-white/10 transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
        <span
          className="material-symbols-outlined text-[18px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <p className="font-['Manrope'] text-3xl font-extrabold text-foreground dark:text-white tabular-nums leading-none">
        {numeric !== undefined ? `${count}${suffix}` : value}
      </p>
      <p className="font-['Manrope'] text-xs text-muted-foreground dark:text-white/50 mt-2 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: "description",
    title: "PDF Intelligence",
    desc: "Upload and query across hundreds of PDF documents using advanced RAG retrieval.",
  },
  {
    icon: "database",
    title: "Database Queries",
    desc: "Ask natural-language questions directly against your structured databases.",
  },
  {
    icon: "chat_bubble",
    title: "Chat Corpus",
    desc: "Mine institutional knowledge from Slack, Teams, and other messaging archives.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const typed = useTypewriter(CYCLE_WORDS);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-y-auto selection:bg-primary/20">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="w-full px-10 py-5 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)]">
            <span
              className="material-symbols-outlined text-white text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
          </div>
          <div>
            <h1 className="font-['Manrope'] text-xl font-extrabold text-primary leading-none">
              DocuLens
            </h1>
            <p className="font-['Manrope'] text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mt-0.5">
              Enterprise Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={() => router.push("/login")}
            className="text-muted-foreground font-['Manrope'] font-semibold hover:text-primary"
          >
            Sign In
          </Button>
          <Button
            onClick={() => router.push("/login")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold hover:shadow-[0_0_0_6px_rgba(74,124,255,0.15)] transition-shadow"
          >
            Get Started →
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Drifting orbs */}
        <div className="absolute top-16 left-[8%] w-72 h-72 rounded-full bg-primary/10 blur-[80px] animate-[drift_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-8 right-[6%] w-96 h-96 rounded-full bg-primary/15 blur-[100px] animate-[drift_11s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-card border border-border text-primary text-[11px] font-bold px-4 py-1.5 rounded-full mb-10 font-['Manrope'] tracking-widest uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
            Now in Beta
          </div>

          <h2 className="font-['Manrope'] text-[clamp(2.8rem,6vw,5rem)] font-extrabold text-foreground leading-[1.06] mb-6 tracking-tight">
            Ask anything across
            <br />
            <span className="relative inline-block">
              <span className="text-primary">{typed}</span>
              <span className="animate-[blink_1s_step-end_infinite] text-primary">
                |
              </span>
            </span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-12 leading-relaxed font-['Inter']">
            DocuLens unifies all your enterprise knowledge into one intelligent
            workspace. Plain language in. Synthesized truth out.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/30 blur-md animate-pulse scale-105" />
              <Button
                onClick={() => router.push("/login")}
                size="lg"
                className="relative bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold text-base px-8 shadow-[0_8px_32px_rgba(74,124,255,0.35)] hover:shadow-[0_12px_40px_rgba(74,124,255,0.45)] hover:-translate-y-0.5 transition-all"
              >
                Open Workspace
                <span className="material-symbols-outlined text-lg ml-1">
                  arrow_forward
                </span>
              </Button>
            </div>
            <Button
              onClick={() => router.push("/login")}
              size="lg"
              variant="outline"
              className="border-border text-muted-foreground font-['Manrope'] font-semibold hover:border-primary hover:text-primary bg-background/70 backdrop-blur-sm"
            >
              Explore Sources
            </Button>
          </div>

          <p className="mt-10 text-xs text-muted-foreground/60 font-['Inter']">
            Trusted by analysts, researchers, and enterprise teams worldwide.
          </p>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/40 to-background dark:via-[#060d22]" />
        {/* Glow orbs */}
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/10 dark:bg-primary/20 blur-[80px] pointer-events-none" />
        <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/10 dark:bg-primary/15 blur-[60px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="text-center text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary/70 mb-8">By the numbers</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatItem
              value="10M+"
              label="Documents Indexed"
              numeric={10}
              suffix="M+"
              icon="description"
            />
            <StatItem
              value="99%"
              label="Retrieval Accuracy"
              numeric={99}
              suffix="%"
              icon="verified"
            />
            <StatItem
              value="2s"
              label="Avg. Response Time"
              numeric={2}
              suffix="s"
              icon="bolt"
            />
            <StatItem value="SOC 2" label="Certified Security" icon="shield" />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20 w-full">
        <div className="text-center mb-12">
          <p className="text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary mb-3">
            What it does
          </p>
          <h3 className="font-['Manrope'] text-4xl font-extrabold text-foreground mb-4 leading-tight">
            One brain.
            <br />
            All your data.
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto font-['Inter']">
            Zero hallucination blindspots. Full source traceability.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map((f) => (
            <SpotlightCard key={f.title}>
              <div className="p-7">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-5 ring-1 ring-border">
                  <span
                    className="material-symbols-outlined text-[18px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h4 className="font-['Manrope'] font-extrabold text-base text-foreground mb-2">
                  {f.title}
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed font-['Inter']">
                  {f.desc}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        {/* Page background bleeds through */}
        <div className="absolute inset-0 bg-background" />
        {/* Ambient glow blobs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="absolute left-[15%] top-[20%] w-48 h-48 rounded-full bg-primary/10 blur-[70px] pointer-events-none" />
        <div className="absolute right-[10%] bottom-[10%] w-56 h-56 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

        {/* Glass card */}
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="rounded-3xl border border-primary/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_60px_rgba(74,124,255,0.15)] dark:shadow-[0_8px_60px_rgba(74,124,255,0.2)] p-12 text-center">
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
                  onClick={() => router.push("/login")}
                  size="lg"
                  className="relative bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-extrabold text-base px-10 shadow-[0_8px_32px_rgba(74,124,255,0.4)] hover:-translate-y-0.5 transition-all"
                >
                  Launch DocuLens →
                </Button>
              </div>
              <Button
                onClick={() => router.push("/login")}
                size="lg"
                variant="outline"
                className="border-primary/30 text-primary font-['Manrope'] font-semibold hover:bg-primary/10 bg-transparent"
              >
                Learn more
              </Button>
            </div>

            {/* Subtle divider + trust note */}
            <div className="mt-10 pt-8 border-t border-border/50 flex items-center justify-center gap-6 flex-wrap">
              {["SOC 2 Certified", "99% Accuracy", "< 2s Response"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground font-['Inter']">
                  <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-8 text-center text-muted-foreground/60 text-xs font-['Manrope'] bg-background border-t border-border/60">
        © {new Date().getFullYear()} DocuLens · Enterprise Intelligence
      </footer>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(20px, -15px) scale(1.04); }
          66%       { transform: translate(-10px, 10px) scale(0.97); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
