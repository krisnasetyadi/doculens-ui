"use client";

import { useEffect, useRef, useState } from "react";

const STEP_VH = 70;
const NODE_X = [50, 150, 250, 350];

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function useScrollyProgress() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReducedMotion(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      setProgress(scrollable <= 0 ? 1 : clamp01(-rect.top / scrollable));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  return { containerRef, progress: reducedMotion ? 1 : progress, reducedMotion };
}

const features = [
  {
    icon: "description",
    title: "File Intelligence",
    desc: "Upload and query across hundreds of files — PDFs, chat exports, and more — using advanced RAG retrieval.",
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

export function LandingFeatures() {
  const { containerRef, progress, reducedMotion } = useScrollyProgress();
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  useEffect(() => {
    setPathLengths(pathRefs.current.map((p) => p?.getTotalLength() ?? 0));
  }, []);

  const n = features.length;
  const localProgress = features.map((_, i) => clamp01((progress - i / n) * n));
  const hubProgress = clamp01((progress - 0.85) / 0.15);

  return (
    <section id="features" className="max-w-5xl mx-auto px-6 py-20 w-full scroll-mt-20">
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
      {/* Desktop / tablet: sources converging into one hub, scroll-driven */}
      <div
        ref={reducedMotion ? undefined : containerRef}
        className="hidden sm:block relative"
        style={reducedMotion ? undefined : { height: `${100 + n * STEP_VH}vh` }}
      >
        <div className={reducedMotion ? "" : "sticky top-0 h-screen flex flex-col items-center justify-center"}>
          <div className="w-full">
            <div className="grid grid-cols-4 gap-5">
              {features.map((f, i) => {
                const lp = localProgress[i];
                const textOpacity = clamp01((lp - 0.4) / 0.6);
                return (
                  <div key={f.title} className="flex flex-col items-center text-center" style={{ opacity: 0.35 + 0.65 * lp }}>
                    <div
                      className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mb-4 shadow-sm"
                      style={{ transform: `scale(${0.7 + 0.3 * lp})` }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {f.icon}
                      </span>
                    </div>
                    <h4 className="font-['Manrope'] font-extrabold text-sm text-foreground mb-1.5">
                      {f.title}
                    </h4>
                    <p
                      className="text-muted-foreground text-xs leading-relaxed font-['Inter']"
                      style={{ opacity: textOpacity, transform: `translateY(${(1 - textOpacity) * 6}px)` }}
                    >
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <svg
              className="w-full h-[90px]"
              viewBox="0 0 400 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {NODE_X.map((x, i) => {
                const len = pathLengths[i] ?? 0;
                return (
                  <path
                    key={x}
                    ref={(el) => {
                      pathRefs.current[i] = el;
                    }}
                    d={`M ${x} 0 C ${x} 55, 200 45, 200 100`}
                    stroke="rgb(59 111 240 / 0.35)"
                    className="dark:[stroke:rgb(74_124_255_/_0.4)]"
                    strokeWidth="1.5"
                    fill="none"
                    style={{ strokeDasharray: len, strokeDashoffset: len * (1 - localProgress[i]) }}
                  />
                );
              })}
            </svg>

            <div className="relative flex flex-col items-center">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-primary/15 dark:bg-primary/20 blur-[50px] pointer-events-none"
                style={{ opacity: hubProgress }}
              />
              <div
                className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_0_6px_rgba(74,124,255,0.12)] shadow-[0_8px_28px_rgba(59,111,240,0.35)]"
                style={{ transform: `scale(${0.6 + 0.4 * hubProgress})`, opacity: 0.3 + 0.7 * hubProgress }}
              >
                <span
                  className="material-symbols-outlined text-white text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  hub
                </span>
              </div>
              <p
                className="relative font-['Manrope'] text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-3"
                style={{ opacity: hubProgress }}
              >
                Unified Index
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stacked list feeding into the hub */}
      <div className="sm:hidden flex flex-col gap-6">
        {features.map((f) => (
          <div key={f.title} className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[18px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {f.icon}
              </span>
            </div>
            <div>
              <h4 className="font-['Manrope'] font-extrabold text-sm text-foreground mb-1">
                {f.title}
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed font-['Inter']">
                {f.desc}
              </p>
            </div>
          </div>
        ))}
        <div className="flex flex-col items-center pt-2">
          <span
            className="material-symbols-outlined text-muted-foreground/40 text-xl mb-2"
            aria-hidden="true"
          >
            keyboard_double_arrow_down
          </span>
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-[0_8px_24px_rgba(59,111,240,0.35)]">
            <span
              className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
          </div>
          <p className="font-['Manrope'] text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-3">
            Unified Index
          </p>
        </div>
      </div>
    </section>
  );
}
