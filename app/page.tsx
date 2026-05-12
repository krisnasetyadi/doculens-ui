"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// All workspace pages (home/ask/sources/…) live in app/(workspace)/

const features = [
  {
    icon: "description",
    title: "PDF Intelligence",
    desc: "Upload and query across hundreds of PDF documents using advanced RAG retrieval.",
    color: "#dbe1ff",
    accent: "#0053db",
  },
  {
    icon: "database",
    title: "Database Queries",
    desc: "Ask natural-language questions directly against your structured databases.",
    color: "#d5e3fc",
    accent: "#0053db",
  },
  {
    icon: "chat_bubble",
    title: "Chat Corpus",
    desc: "Mine institutional knowledge from Slack, Teams, and other messaging archives.",
    color: "#e8eff3",
    accent: "#0053db",
  },
  {
    icon: "hub",
    title: "Knowledge Graph",
    desc: "Visualize conceptual links across all your enterprise knowledge sources.",
    color: "#f0f4f7",
    accent: "#455367",
  },
];

const stats = [
  { value: "10M+", label: "Documents Indexed" },
  { value: "99.2%", label: "Retrieval Accuracy" },
  { value: "< 2s", label: "Avg. Response Time" },
  { value: "SOC 2", label: "Certified Security" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Landing page at `/`
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col overflow-y-auto">
      {/* Topbar */}
      <header className="w-full px-10 py-5 flex items-center justify-between border-b border-[#d9e4ea] bg-[#f7f9fb]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0053db] rounded-xl flex items-center justify-center shadow">
            <span className="material-symbols-outlined text-white text-xl">
              hub
            </span>
          </div>
          <div>
            <h1 className="font-['Manrope'] text-xl font-extrabold text-[#1E3A8A] leading-none">
              DocuLens
            </h1>
            <p className="font-['Manrope'] text-[10px] font-semibold tracking-widest uppercase text-[#566166]">
              Enterprise Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/home")}
            className="text-[#0053db] font-['Manrope'] font-bold"
          >
            Sign In
          </Button>
          <Button
            onClick={() => router.push("/home")}
            className="bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-bold shadow"
          >
            Get Started →
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-[#dbe1ff] text-[#0053db] text-xs font-bold px-4 py-1.5 rounded-full mb-8 font-['Manrope'] tracking-wide uppercase">
          <span
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          Enterprise-grade Knowledge Intelligence
        </div>
        <h2 className="font-['Manrope'] text-6xl font-extrabold text-[#1E3A8A] leading-[1.08] mb-6 tracking-tight">
          Ask anything across
          <br />
          <span className="text-[#0053db]">all your knowledge</span>
        </h2>
        <p className="text-[#566166] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          DocuLens unifies PDFs, databases, and chat archives into a single
          intelligent workspace. Ask in plain language, get synthesized answers
          with full traceability.
        </p>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/home")}
            size="lg"
            className="bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-bold shadow-lg hover:shadow-xl"
          >
            Open Workspace
          </Button>
          <Button
            onClick={() => router.push("/sources")}
            size="lg"
            variant="outline"
            className="border-2 border-[#0053db] text-[#0053db] hover:bg-[#0053db]/5 font-['Manrope'] font-bold"
          >
            Manage Sources
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0053db] py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-['Manrope'] text-4xl font-extrabold text-white">
                {s.value}
              </p>
              <p className="font-['Manrope'] text-sm text-white/70 mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24 w-full">
        <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#1E3A8A] text-center mb-3">
          Built for enterprise knowledge work
        </h3>
        <p className="text-[#566166] text-center mb-12">
          One platform. All your data. Zero hallucination blindspots.
        </p>
        <div className="grid grid-cols-2 gap-6">
          {features.map((f, i) => (
            <Card
              key={f.title}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="rounded-2xl p-0 cursor-default transition-all duration-200 border-[#d9e4ea]"
              style={{
                boxShadow:
                  hovered === i
                    ? "0 12px 32px rgba(0,83,219,0.10)"
                    : "0 2px 8px rgba(0,0,0,0.04)",
                transform: hovered === i ? "translateY(-2px)" : "none",
              }}
            >
              <CardContent className="p-8">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: f.color }}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{
                      color: f.accent,
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h4 className="font-['Manrope'] font-extrabold text-xl text-[#1E3A8A] mb-2">
                  {f.title}
                </h4>
                <p className="text-[#566166] text-sm leading-relaxed">
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#cfdce3] py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h3 className="font-['Manrope'] text-4xl font-extrabold text-[#1E3A8A] mb-4">
            Ready to unlock your knowledge?
          </h3>
          <p className="text-[#566166] mb-8">
            Start synthesizing answers from your enterprise data in minutes.
          </p>
          <Button
            onClick={() => router.push("/home")}
            size="lg"
            className="bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-bold shadow-lg"
          >
            Launch DocuLens →
          </Button>
        </div>
      </section>

      <footer className="py-8 text-center text-[#566166] text-xs font-['Manrope']">
        © {new Date().getFullYear()} DocuLens Enterprise Intelligence. All
        rights reserved.
      </footer>
    </div>
  );
}
