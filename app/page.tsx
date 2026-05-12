"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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
      className={`relative overflow-hidden rounded-2xl border border-[#d9e4ea] bg-white transition-transform duration-200 hover:-translate-y-1 ${className}`}
      style={{
        boxShadow: inside
          ? "0 20px 48px rgba(0,83,219,0.12)"
          : "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      {inside && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, rgba(0,83,219,0.06), transparent 70%)`,
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
}: {
  value: string;
  label: string;
  numeric?: number;
  suffix?: string;
}) {
  const { count, ref } = useCountUp(numeric ?? 0);
  return (
    <div ref={ref} className="text-center">
      <p className="font-['Manrope'] text-4xl font-extrabold text-white tabular-nums">
        {numeric !== undefined ? `${count}${suffix}` : value}
      </p>
      <p className="font-['Manrope'] text-sm text-white/60 mt-1">{label}</p>
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
    icon: "hub",
    title: "Knowledge Graph",
    desc: "Visualize conceptual links across all your enterprise knowledge sources.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const typed = useTypewriter(CYCLE_WORDS);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col overflow-y-auto selection:bg-[#0053db]/20">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="w-full px-10 py-5 flex items-center justify-between border-b border-[#d9e4ea]/60 bg-[#f7f9fb]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0053db] rounded-xl flex items-center justify-center shadow-[0_0_0_4px_rgba(0,83,219,0.12)]">
            <span
              className="material-symbols-outlined text-white text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
          </div>
          <div>
            <h1 className="font-['Manrope'] text-xl font-extrabold text-[#1E3A8A] leading-none">
              DocuLens
            </h1>
            <p className="font-['Manrope'] text-[9px] font-bold tracking-[0.2em] uppercase text-[#566166]/60 mt-0.5">
              Enterprise Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/home")}
            className="text-[#566166] font-['Manrope'] font-semibold hover:text-[#0053db]"
          >
            Sign In
          </Button>
          <Button
            onClick={() => router.push("/home")}
            className="bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-bold hover:shadow-[0_0_0_6px_rgba(0,83,219,0.12)] transition-shadow"
          >
            Get Started →
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #a9b4b9 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Drifting orbs */}
        <div className="absolute top-16 left-[8%] w-72 h-72 rounded-full bg-[#0053db]/10 blur-[80px] animate-[drift_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-8 right-[6%] w-96 h-96 rounded-full bg-[#dbe1ff]/40 blur-[100px] animate-[drift_11s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#0053db]/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white border border-[#d9e4ea] text-[#0053db] text-[11px] font-bold px-4 py-1.5 rounded-full mb-10 font-['Manrope'] tracking-widest uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0053db] animate-pulse inline-block" />
            Now in Beta
          </div>

          <h2 className="font-['Manrope'] text-[clamp(2.8rem,6vw,5rem)] font-extrabold text-[#1E3A8A] leading-[1.06] mb-6 tracking-tight">
            Ask anything across
            <br />
            <span className="relative inline-block">
              <span className="text-[#0053db]">{typed}</span>
              <span className="animate-[blink_1s_step-end_infinite] text-[#0053db]">
                |
              </span>
            </span>
          </h2>

          <p className="text-[#566166] text-lg max-w-xl mx-auto mb-12 leading-relaxed font-['Inter']">
            DocuLens unifies all your enterprise knowledge into one intelligent
            workspace. Plain language in. Synthesized truth out.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-[#0053db]/30 blur-md animate-pulse scale-105" />
              <Button
                onClick={() => router.push("/home")}
                size="lg"
                className="relative bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-bold text-base px-8 shadow-[0_8px_32px_rgba(0,83,219,0.35)] hover:shadow-[0_12px_40px_rgba(0,83,219,0.45)] hover:-translate-y-0.5 transition-all"
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
              className="border-[#d9e4ea] text-[#566166] font-['Manrope'] font-semibold hover:border-[#0053db] hover:text-[#0053db] bg-white/70 backdrop-blur-sm"
            >
              Explore Sources
            </Button>
          </div>

          <p className="mt-10 text-xs text-[#a9b4b9] font-['Inter']">
            Trusted by analysts, researchers, and enterprise teams worldwide.
          </p>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="bg-[#0053db] py-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 relative z-10">
          <StatItem
            value="10M+"
            label="Documents Indexed"
            numeric={10}
            suffix="M+"
          />
          <StatItem
            value="99%"
            label="Retrieval Accuracy"
            numeric={99}
            suffix="%"
          />
          <StatItem
            value="2s"
            label="Avg. Response Time"
            numeric={2}
            suffix="s"
          />
          <StatItem value="SOC 2" label="Certified Security" />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28 w-full">
        <div className="text-center mb-16">
          <p className="text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-[#0053db] mb-3">
            What it does
          </p>
          <h3 className="font-['Manrope'] text-4xl font-extrabold text-[#1E3A8A] mb-4 leading-tight">
            One brain.
            <br />
            All your data.
          </h3>
          <p className="text-[#566166] max-w-md mx-auto font-['Inter']">
            Zero hallucination blindspots. Full source traceability.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f) => (
            <SpotlightCard key={f.title}>
              <div className="p-8">
                <div className="w-11 h-11 rounded-xl bg-[#f0f4f7] flex items-center justify-center mb-5 ring-1 ring-[#d9e4ea]">
                  <span
                    className="material-symbols-outlined text-xl text-[#0053db]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h4 className="font-['Manrope'] font-extrabold text-lg text-[#1E3A8A] mb-2">
                  {f.title}
                </h4>
                <p className="text-[#566166] text-sm leading-relaxed font-['Inter']">
                  {f.desc}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0053db] via-[#1a4fd8] to-[#0040b0]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-[60px]" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-white/5 blur-[80px]" />
        <div className="relative z-10 max-w-2xl mx-auto text-center px-6">
          <h3 className="font-['Manrope'] text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Your knowledge is waiting to be asked.
          </h3>
          <p className="text-white/60 mb-10 font-['Inter'] text-lg">
            Start in seconds. No setup required.
          </p>
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-xl bg-white/20 blur-md animate-pulse scale-110" />
            <Button
              onClick={() => router.push("/home")}
              size="lg"
              className="relative bg-white text-[#0053db] hover:bg-white/90 font-['Manrope'] font-extrabold text-base px-10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all"
            >
              Launch DocuLens →
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-8 text-center text-[#a9b4b9] text-xs font-['Manrope'] bg-[#f7f9fb] border-t border-[#d9e4ea]/60">
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
