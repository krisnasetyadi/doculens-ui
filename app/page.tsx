"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotlightCard } from "@/components/spotlight-card";

// ── Typewriter cycling through source types ───────────────────────────────
const CYCLE_WORDS = ["PDFs", "databases", "chat logs", "web links", "your knowledge"];

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

// ── Scroll-driven progress (0 → 1 over `range` px of scroll) ─────────────
function useScrollProgress(ref: React.RefObject<HTMLElement | null>, range = 500) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const el = ref.current;
      ticking = false;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const scrolled = Math.min(Math.max(-top, 0), range);
      setProgress(scrolled / range);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref, range]);

  return progress;
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

// ── Stat item with count-up ───────────────────────────────────────────────
function StatItem({
  value,
  label,
  sublabel,
  numeric,
  suffix = "",
  icon,
}: {
  value: string;
  label: string;
  sublabel?: string;
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
      {sublabel && (
        <p className="font-['Inter'] text-[10px] text-muted-foreground/50 dark:text-white/30 mt-1 normal-case tracking-normal">{sublabel}</p>
      )}
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
  {
    icon: "link",
    title: "Web Links",
    desc: "Point to any public URL and query its content alongside the rest of your knowledge base.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
const pricingPlans = [
  {
    name: "Individual",
    price: "Rp 65.000",
    period: "/mo",
    tagline: "For individual researchers & professionals",
    highlight: false,
    features: [
      "1 user",
      "All source types (PDF, Database, Chat, Web Link)",
      "5 GB storage for your documents, chat logs, and data",
      "100% relevant retrieval",
      "Personal search history",
    ],
    cta: "Get Started",
  },
  {
    name: "Team",
    price: "Rp 500.000",
    period: "/mo",
    tagline: "One shared knowledge base for small teams",
    highlight: true,
    features: [
      "5 team members + 1 admin seat",
      "Admin assigns which sources each member can access",
      "1 shared workspace — upload once, everyone can ask",
      "30 GB shared storage",
      "Centralized billing",
      "Priority support",
    ],
    cta: "Choose Team",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For organizations with custom requirements",
    highlight: false,
    features: [
      "Unlimited seats",
      "Custom storage — no fixed limit",
      "SSO & advanced access control",
      "Custom integrations (SharePoint, Google Drive, MongoDB)",
      "SLA & dedicated support",
      "On-premise / private cloud deployment",
    ],
    cta: "Contact Us",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const typed = useTypewriter(CYCLE_WORDS);
  const heroRef = useRef<HTMLDivElement>(null);
  const scrollP = useScrollProgress(heroRef, 520);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-y-auto selection:bg-primary/20">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="w-full px-4 sm:px-10 py-4 sm:py-5 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(74,124,255,0.15)]">
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
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={() => router.push("/login")}
            className="hidden sm:inline-flex text-muted-foreground font-['Manrope'] font-semibold hover:text-primary"
          >
            Sign In
          </Button>
          <Button
            onClick={() => router.push("/home")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold hover:shadow-[0_0_0_6px_rgba(74,124,255,0.15)] transition-shadow px-3 sm:px-4 text-sm sm:text-base"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Get Started →</span>
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden"
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            transform: `translateY(${scrollP * 60}px)`,
            opacity: 0.25 * (1 - scrollP * 0.7),
          }}
        />
        {/* Drifting orbs (parallax at different rates on scroll) */}
        <div
          className="absolute top-16 left-[8%] w-72 h-72 rounded-full bg-primary/10 blur-[80px] animate-[drift_8s_ease-in-out_infinite]"
          style={{ transform: `translate3d(0, ${-scrollP * 90}px, 0) scale(${1 + scrollP * 0.3})` }}
        />
        <div
          className="absolute bottom-8 right-[6%] w-96 h-96 rounded-full bg-primary/15 blur-[100px] animate-[drift_11s_ease-in-out_infinite_reverse]"
          style={{ transform: `translate3d(0, ${scrollP * 110}px, 0) scale(${1 + scrollP * 0.25})` }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"
          style={{ transform: `translate(-50%, -50%) scale(${1 + scrollP * 0.4})`, opacity: 1 - scrollP * 0.6 }}
        />

        <div
          className="relative z-10 max-w-4xl mx-auto will-change-transform"
          style={{
            transform: `translateY(${scrollP * 36}px) scale(${1 - scrollP * 0.06})`,
            opacity: 1 - scrollP * 0.85,
          }}
        >
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
                onClick={() => router.push("/home")}
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
              onClick={() => router.push("/home")}
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

        {/* Scroll cue */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
          style={{ opacity: 1 - scrollP * 3 }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-['Manrope'] font-bold">
            Scroll
          </span>
          <span className="material-symbols-outlined text-muted-foreground/50 text-xl animate-bounce">
            keyboard_arrow_down
          </span>
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
              value="4+"
              label="Source Types"
              numeric={4}
              suffix="+"
              icon="hub"
            />
            <StatItem
              value="100%"
              label="Relevant Results"
              sublabel="Precision@K"
              numeric={100}
              suffix="%"
              icon="verified"
            />
            <StatItem value="2-5s" label="Cold-Start Response" icon="bolt" />
            <StatItem
              value="100%"
              label="Always Top-Ranked"
              sublabel="Mean Reciprocal Rank"
              numeric={100}
              suffix="%"
              icon="adjust"
            />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background dark:via-[#060d22]" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary mb-3">
              Pricing
            </p>
            <h3 className="font-['Manrope'] text-4xl font-extrabold text-foreground mb-4 leading-tight">
              Simple plans.
              <br />
              No surprises.
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto font-['Inter']">
              From solo to team — pay for what you need, not empty promises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                  plan.highlight
                    ? "border-primary bg-white dark:bg-white/5 shadow-[0_12px_48px_rgba(74,124,255,0.18)] md:scale-[1.03]"
                    : "border-border bg-white/60 dark:bg-white/5 dark:border-white/10"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full font-['Manrope'] tracking-widest uppercase">
                    Recommended
                  </div>
                )}
                <h4 className="font-['Manrope'] font-extrabold text-lg text-foreground mb-1">
                  {plan.name}
                </h4>
                <p className="text-muted-foreground text-sm font-['Inter'] mb-6 min-h-[2.5rem]">
                  {plan.tagline}
                </p>
                <div className="mb-6">
                  <span className="font-['Manrope'] text-3xl font-extrabold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm font-['Inter']">
                    {plan.period}
                  </span>
                </div>
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground font-['Inter']">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">
                        check
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => router.push("/home")}
                  className={
                    plan.highlight
                      ? "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold"
                      : "w-full bg-transparent border border-border text-foreground hover:border-primary hover:text-primary font-['Manrope'] font-semibold"
                  }
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
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
