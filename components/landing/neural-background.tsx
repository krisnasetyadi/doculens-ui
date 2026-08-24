"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NeuralBackgroundProps {
  /** 0 → 1 scroll progress through the host section; drives zoom/dispersion/fade. */
  scrollProgress?: number;
  className?: string;
}

interface Node {
  x: number; // relative [0,1] position around the hub
  y: number;
  r: number;
  tone: "bright" | "mid" | "dim";
  phase: number;
  freq: number;
  driftR: number;
}

const HUB = { x: 0.46, y: 0.42 };
const NODE_COUNT = 42;

function buildNodes(): Node[] {
  return Array.from({ length: NODE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.12 + Math.random() * 0.42;
    const toneRoll = Math.random();
    return {
      x: HUB.x + Math.cos(angle) * dist,
      y: HUB.y + Math.sin(angle) * dist * 0.85,
      r: 1.4 + Math.random() * 2.6,
      tone: toneRoll < 0.15 ? "bright" : toneRoll < 0.6 ? "mid" : "dim",
      phase: Math.random() * Math.PI * 2,
      freq: 0.15 + Math.random() * 0.25,
      driftR: 5 + Math.random() * 9,
    };
  });
}

/** Hub-and-spoke node network (à la a "neural network" hero visual), rendered
 * on canvas so 40+ animated nodes/lines stay smooth. Reads its colors from
 * the current theme (the `dark` class on <html>) since the glow treatment
 * that sells the effect only works against this app's near-black dark-mode
 * background — light mode gets a dimmer, glow-free navy variant instead so
 * it still reads against the light background rather than washing out. */
export function NeuralBackground({ scrollProgress = 0, className }: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDarkRef = { current: document.documentElement.classList.contains("dark") };
    const themeObserver = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const nodes = buildNodes();
    const hubLinks = nodes.map((_, i) => i).filter(() => Math.random() < 0.55);
    const meshLinks: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.hypot(dx, dy) < 0.12 && Math.random() < 0.15) meshLinks.push([i, j]);
      }
    }

    let running = true;
    let raf = 0;
    const start = performance.now();

    // Signal pulses: a small bright dot travels from the hub to a random
    // linked node every couple of seconds — reinforces the "neural network"
    // idea (a synapse firing) beyond the static twinkling nodes. Cheap: at
    // most 3 concurrent, each just one extra filled circle per frame.
    type Pulse = { targetIndex: number; startedAt: number; duration: number };
    let pulses: Pulse[] = [];
    let nextPulseAt = start + 600;

    function toneColor(tone: Node["tone"], alpha: number, dark: boolean) {
      if (dark) {
        if (tone === "bright") return `rgba(224, 242, 254, ${alpha})`; // near-white cyan
        if (tone === "mid") return `rgba(103, 200, 249, ${alpha})`; // cyan-blue
        return `rgba(74, 124, 255, ${alpha})`; // primary blue
      }
      // Light mode: no glow (it just reads as blur on a light bg), darker
      // navy/primary tones instead so the network reads as ink-on-paper.
      if (tone === "bright") return `rgba(59, 111, 240, ${alpha})`;
      if (tone === "mid") return `rgba(37, 84, 199, ${alpha})`;
      return `rgba(10, 15, 30, ${alpha})`;
    }

    function renderFrame(now: number) {
      const dark = isDarkRef.current;
      const time = (now - start) / 1000;
      const sp = scrollRef.current;
      ctx!.clearRect(0, 0, width, height);

      const alphaGlobal = Math.max(0, 1 - sp * 0.95);
      if (alphaGlobal <= 0.01 || width === 0 || height === 0) return;

      const minDim = Math.min(width, height);
      const cx = HUB.x * width;
      const cy = HUB.y * height;
      const scale = 1 + sp * 0.25;
      const dispersion = 1 + sp * 1.3;

      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.scale(scale, scale);
      ctx!.translate(-cx, -cy);

      const positions = nodes.map((n) => {
        const driftAngle = time * n.freq + n.phase;
        const baseX = HUB.x + (n.x - HUB.x) * dispersion;
        const baseY = HUB.y + (n.y - HUB.y) * dispersion;
        return {
          x: baseX * width + Math.cos(driftAngle) * n.driftR,
          y: baseY * height + Math.sin(driftAngle * 1.3) * n.driftR,
        };
      });

      hubLinks.forEach((i) => {
        const p = positions[i];
        const d = Math.hypot(p.x - cx, p.y - cy) / minDim;
        const alpha = Math.max(0, (dark ? 0.32 : 0.4) - d * 0.4) * alphaGlobal;
        if (alpha <= 0.004) return;
        ctx!.strokeStyle = toneColor("mid", alpha, dark);
        ctx!.lineWidth = dark ? 1 : 1.2;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(p.x, p.y);
        ctx!.stroke();
      });

      if (now >= nextPulseAt && hubLinks.length > 0 && pulses.length < 3) {
        pulses.push({
          targetIndex: hubLinks[Math.floor(Math.random() * hubLinks.length)],
          startedAt: now,
          duration: 900 + Math.random() * 500,
        });
        nextPulseAt = now + 900 + Math.random() * 1400;
      }
      pulses = pulses.filter((p) => now - p.startedAt < p.duration);
      pulses.forEach((p) => {
        const t = (now - p.startedAt) / p.duration;
        const target = positions[p.targetIndex];
        const x = cx + (target.x - cx) * t;
        const y = cy + (target.y - cy) * t;
        const alpha = Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI) * alphaGlobal;
        if (alpha <= 0.01) return;
        ctx!.beginPath();
        ctx!.fillStyle = toneColor("bright", alpha, dark);
        if (dark) {
          ctx!.shadowColor = toneColor("bright", 0.9 * alpha, dark);
          ctx!.shadowBlur = 8;
        } else {
          ctx!.shadowBlur = 0;
        }
        ctx!.arc(x, y, 2, 0, Math.PI * 2);
        ctx!.fill();
      });

      meshLinks.forEach(([i, j]) => {
        const a = positions[i];
        const b = positions[j];
        ctx!.strokeStyle = toneColor("dim", (dark ? 0.14 : 0.22) * alphaGlobal, dark);
        ctx!.lineWidth = dark ? 0.75 : 0.9;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      });

      nodes.forEach((n, i) => {
        const p = positions[i];
        const glow = 0.6 + 0.4 * Math.sin(time * n.freq * 2 + n.phase);
        ctx!.beginPath();
        ctx!.fillStyle = toneColor(n.tone, alphaGlobal, dark);
        if (dark) {
          ctx!.shadowColor = toneColor(n.tone, 0.8 * alphaGlobal, dark);
          ctx!.shadowBlur = 6 * glow;
        } else {
          ctx!.shadowBlur = 0;
        }
        ctx!.arc(p.x, p.y, n.r, 0, Math.PI * 2);
        ctx!.fill();
      });

      const hubGlow = 0.8 + 0.2 * Math.sin(time * 1.2);
      ctx!.beginPath();
      ctx!.fillStyle = dark ? `rgba(255, 255, 255, ${alphaGlobal})` : `rgba(59, 111, 240, ${alphaGlobal})`;
      if (dark) {
        ctx!.shadowColor = `rgba(120, 170, 255, ${0.9 * alphaGlobal})`;
        ctx!.shadowBlur = 22 * hubGlow;
      } else {
        ctx!.shadowBlur = 0;
      }
      ctx!.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.restore();
    }

    function loop(now: number) {
      if (!running) return;
      renderFrame(now);
      raf = requestAnimationFrame(loop);
    }

    // Only spend CPU/battery animating while the hero is actually visible,
    // and skip the loop entirely for reduced-motion users (single static frame).
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting && !prefersReducedMotion;
        if (running) {
          raf = requestAnimationFrame(loop);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(canvas);

    if (prefersReducedMotion) renderFrame(start);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  // w-full h-full is load-bearing, not decorative: canvas is a replaced
  // element, so `inset-0` alone does NOT stretch it to fill an absolutely
  // positioned parent the way it would a <div> — it keeps its intrinsic
  // 300x150 size instead, and getBoundingClientRect() below would then only
  // ever measure that tiny box. Always keep an explicit size class here.
  return <canvas ref={canvasRef} aria-hidden="true" className={cn("w-full h-full", className)} />;
}
