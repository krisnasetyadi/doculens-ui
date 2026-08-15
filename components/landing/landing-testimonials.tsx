"use client";

import { Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// PLACEHOLDER CONTENT — these are illustrative quotes, not real customers.
// Replace every entry with an actual user's name/role/quote before this
// section ever goes live; do not ship placeholder testimonials as real ones.
const testimonials = [
  { name: "A. Ramadhan", role: "Compliance Analyst", quote: "Cross-checking a policy PDF against the reference framework used to take an afternoon. Now it's one query." },
  { name: "J. Santoso", role: "Research Lead", quote: "I can ask the same question across a hundred PDFs and our Slack archive in one go. No more tab-switching." },
  { name: "N. Wijaya", role: "Data Analyst", quote: "The database query mode understands plain-language questions well enough that I stopped writing SQL for one-off lookups." },
  { name: "R. Hidayat", role: "Ops Manager", quote: "Every answer comes with a source citation, so I can actually verify it before I forward it to my team." },
  { name: "S. Pratama", role: "Product Manager", quote: "Pointing it at a public web link and having it searchable in seconds is the feature I didn't know I needed." },
  { name: "D. Kusuma", role: "Knowledge Manager", quote: "Chat exports from three different platforms, one search box. That alone justified switching." },
  { name: "M. Firmansyah", role: "Auditor", quote: "The gap analysis skill flagged a missing control we'd genuinely overlooked in a 40-page framework." },
  { name: "L. Anggraini", role: "Consultant", quote: "Cold-start responses in a few seconds even on our larger collections — I didn't expect that." },
  { name: "T. Nugroho", role: "Team Lead", quote: "Admins assigning source access per member turned out to matter a lot more than I expected for a shared workspace." },
];

const columns = [
  testimonials.slice(0, 3),
  testimonials.slice(3, 6),
  testimonials.slice(6, 9),
];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function TestimonialCard({ name, role, quote }: { name: string; role: string; quote: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <Quote
        className="absolute top-4 right-4 w-8 h-8 text-primary/10"
        fill="currentColor"
        strokeWidth={0}
        aria-hidden="true"
      />
      <p className="relative font-['Inter'] text-[15px] text-foreground/90 leading-relaxed mb-5">
        {quote}
      </p>
      <div className="relative flex items-center gap-3">
        <Avatar className="w-9 h-9 ring-2 ring-primary/10 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 font-['Manrope'] text-xs font-extrabold text-primary">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-['Manrope'] text-sm font-bold text-foreground leading-none truncate">{name}</p>
          <p className="font-['Inter'] text-xs text-muted-foreground mt-1 truncate">{role}</p>
        </div>
      </div>
    </div>
  );
}

function MarqueeColumn({
  items,
  direction,
  duration,
}: {
  items: typeof testimonials;
  direction: "up" | "down";
  duration: number;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee-col relative h-[560px] overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10" />
      <div
        className={`marquee-track flex flex-col gap-5 ${direction === "down" ? "marquee-track--down" : ""}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  return (
    <section id="reviews" className="max-w-5xl mx-auto px-6 py-20 w-full scroll-mt-20">
      <div className="text-center mb-12">
        <p className="text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary mb-3">
          What people are saying
        </p>
        <h3 className="font-['Manrope'] text-4xl font-extrabold text-foreground mb-4 leading-tight">
          Loved by early users.
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto font-['Inter']">
          A few notes from people using DocuLens across PDFs, databases, and chat archives.
        </p>
      </div>

      <div className="hidden sm:grid grid-cols-3 gap-5">
        <MarqueeColumn items={columns[0]} direction="up" duration={38} />
        <MarqueeColumn items={columns[1]} direction="down" duration={44} />
        <MarqueeColumn items={columns[2]} direction="up" duration={50} />
      </div>

      {/* Mobile: static stacked list — no room for 3 columns, and a marquee
         you can't pause with a mouse hover is just hard to read. */}
      <div className="sm:hidden flex flex-col gap-4">
        {testimonials.slice(0, 4).map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </div>

      <style>{`
        @keyframes marquee-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes marquee-down {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
        .marquee-track {
          animation-name: marquee-up;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .marquee-track--down {
          animation-name: marquee-down;
        }
        .marquee-col:hover .marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
