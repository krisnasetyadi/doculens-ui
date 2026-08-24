"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NeuralBackground } from "@/components/landing/neural-background";

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
// Also reports `covered`: true once the tracked element has fully scrolled
// past the viewport — used to unmount the fixed hero so it can't show
// through sections further down the page that don't have an opaque bg.
function useScrollProgress(ref: React.RefObject<HTMLElement | null>, range = 500) {
  const [progress, setProgress] = useState(0);
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const el = ref.current;
      ticking = false;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), range);
      setProgress(scrolled / range);
      setCovered(rect.bottom <= 0);
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

  return { progress, covered };
}

export function LandingHero() {
  const router = useRouter();
  const typed = useTypewriter(CYCLE_WORDS);
  // Spacer (not the pinned section itself) drives scroll progress — the hero
  // is `fixed` so its own rect never moves; the spacer occupies the flow slot
  // that scrolls normally and tells us how far the pin+cover has progressed.
  const spacerRef = useRef<HTMLDivElement>(null);
  const { progress: scrollP, covered } = useScrollProgress(spacerRef, 520);

  return (
    <>
      {/* Reserves scroll distance equal to the pinned hero's height so the
          rest of the page lays out correctly beneath the fixed section. */}
      <div ref={spacerRef} className="h-screen" aria-hidden />
      {!covered && (
      <section
        className="fixed inset-x-0 top-0 z-0 h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      >
      {/* Neural network background — hub-and-spoke node graph, scroll-driven
          zoom/dispersion/fade. Swap back to the old dot-grid + orbs (see git
          history) if this doesn't land well. */}
      <NeuralBackground scrollProgress={scrollP} className="absolute inset-0 w-full h-full pointer-events-none" />
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

        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
          }
        `}</style>
      </section>
      )}
    </>
  );
}
