"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

const REVEAL = "transition-all duration-700 ease-out";
const HIDDEN = "opacity-0 translate-y-4";
const SHOWN = "opacity-100 translate-y-0";

export function LandingCta() {
  const router = useRouter();
  const { ref, visible } = useInView();

  return (
    <section ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Page background bleeds through */}
      <div className="absolute inset-0 bg-background" />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Hub bookend, echoing the "one brain" diagram above */}
        <div
          className={`relative inline-flex flex-col items-center mb-8 ${REVEAL} ${visible ? SHOWN : `${HIDDEN} scale-90`}`}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-primary/15 dark:bg-primary/20 blur-[60px] pointer-events-none animate-[breathe_4.5s_ease-in-out_infinite]"
          />
          <div className="relative w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-[0_8px_28px_rgba(59,111,240,0.35)]">
            <span
              className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
          </div>
        </div>

        <p
          className={`text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary/70 mb-4 delay-100 ${REVEAL} ${visible ? SHOWN : HIDDEN}`}
        >
          Ready when you are
        </p>

        <h3
          className={`font-['Manrope'] text-4xl sm:text-5xl font-extrabold text-foreground mb-4 leading-tight delay-200 ${REVEAL} ${visible ? SHOWN : HIDDEN}`}
        >
          Your knowledge is waiting
          <br />
          <span className="text-primary">to be asked.</span>
        </h3>
        <p
          className={`text-muted-foreground mb-10 font-['Inter'] text-lg max-w-md mx-auto delay-300 ${REVEAL} ${visible ? SHOWN : HIDDEN}`}
        >
          Start in seconds. No setup required.
        </p>

        <Button
          onClick={() => router.push("/home")}
          size="lg"
          className={`bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-extrabold text-base px-10 shadow-[0_8px_32px_rgba(74,124,255,0.4)] hover:shadow-[0_10px_36px_rgba(74,124,255,0.5)] hover:-translate-y-0.5 delay-500 ${REVEAL} ${visible ? SHOWN : HIDDEN}`}
        >
          Launch DocuLens →
        </Button>
      </div>
    </section>
  );
}
