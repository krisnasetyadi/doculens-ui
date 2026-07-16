"use client";

import { useRef, useState } from "react";

// ── Spotlight card (mouse-tracking glow) ─────────────────────────────────
export function SpotlightCard({
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
