"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat-interface";
import { useWorkspaceStore } from "@/stores/workspace-store";

const SOURCES = [
  { icon: "description", label: "PDFs" },
  { icon: "database", label: "Databases" },
  { icon: "chat_bubble", label: "Chat Corpora" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { selectedPdfCollections, selectedChatCollections } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  // "hero" | "transitioning" | "chat"
  const [phase, setPhase] = useState<"hero" | "transitioning" | "chat">("hero");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAsk = (question: string) => {
    if (!question.trim()) return;
    setPendingQuestion(question.trim());
    setPhase("transitioning");
  };

  // After hero exits (500ms), mount chat layer
  useEffect(() => {
    if (phase === "transitioning") {
      const t = setTimeout(() => setPhase("chat"), 480);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div className="relative h-full overflow-hidden">
      {/* ── Ambient orbs (always visible) ── */}
      <div className="fixed top-24 right-[12%] w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none" />
      <div className="fixed bottom-20 left-[8%] w-80 h-80 rounded-full bg-primary/[0.05] blur-[110px] pointer-events-none" />

      {/* ── HERO LAYER ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out"
        style={{
          opacity: phase === "hero" ? 1 : 0,
          transform: phase === "hero" ? "translateY(0)" : "translateY(-48px)",
          pointerEvents: phase === "hero" ? "auto" : "none",
        }}
      >
        <div className="w-full max-w-2xl mx-auto px-8 flex flex-col items-center gap-8">

          {/* Greeting */}
          <div
            className="text-center transition-all duration-300"
            style={{
              opacity: phase === "hero" ? 1 : 0,
              transform: phase === "hero" ? "translateY(0)" : "translateY(-16px)",
              transitionDelay: phase !== "hero" ? "0ms" : "0ms",
            }}
          >
            <h2 className="font-['Manrope'] text-[clamp(2rem,4vw,3rem)] font-extrabold text-foreground tracking-tight leading-[1.1] mb-2">
              {getGreeting()}, <span className="text-primary">Sarah.</span>
            </h2>
            <p className="font-['Inter'] text-muted-foreground">
              What intelligence can I uncover for you today?
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full">
            <div
              className={`rounded-2xl transition-all duration-300 ${
                focused
                  ? "shadow-[0_0_0_2px_rgba(74,124,255,0.35),0_16px_48px_rgba(74,124,255,0.12)]"
                  : "shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
              }`}
            >
              <div className="flex items-center bg-card border border-border rounded-2xl p-2 gap-2">
                <div className={`pl-3 transition-colors duration-200 ${focused ? "text-primary" : "text-muted-foreground/50"}`}>
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </div>
                <input
                  ref={inputRef}
                  className="flex-grow bg-transparent border-none outline-none text-base font-['Inter'] text-foreground py-3.5 px-2 placeholder:text-muted-foreground/40"
                  placeholder="Ask anything across your knowledge base..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAsk(inputValue); }}
                  autoFocus
                />
                <Button
                  onClick={() => handleAsk(inputValue)}
                  size="icon"
                  className={`shrink-0 w-10 h-10 rounded-xl transition-all duration-200 ${
                    inputValue.trim()
                      ? "bg-primary hover:bg-primary/90 text-white shadow-[0_4px_14px_rgba(74,124,255,0.4)] hover:-translate-y-px"
                      : "bg-muted text-muted-foreground/40 cursor-default"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Button>
              </div>
            </div>

            {/* Source chips */}
            <div
              className="flex items-center justify-center gap-2 mt-4 flex-wrap transition-all duration-300"
              style={{
                opacity: phase === "hero" ? 1 : 0,
                transform: phase === "hero" ? "translateY(0)" : "translateY(8px)",
              }}
            >
              {SOURCES.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-['Inter'] font-medium text-muted-foreground bg-muted/60 border border-border"
                >
                  <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {s.icon}
                  </span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Footer hint */}
          <p
            className="text-xs text-muted-foreground/40 font-['Inter'] transition-all duration-200"
            style={{ opacity: phase === "hero" ? 1 : 0 }}
          >
            Press{" "}
            <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded text-[10px] text-muted-foreground">
              ↵ Enter
            </kbd>{" "}
            to search
          </p>
        </div>
      </div>

      {/* ── CHAT LAYER ── slides up from below ── */}
      <div
        className="absolute inset-0 transition-all duration-500 ease-in-out"
        style={{
          opacity: phase === "chat" ? 1 : 0,
          transform: phase === "chat" ? "translateY(0)" : "translateY(40px)",
          pointerEvents: phase === "chat" ? "auto" : "none",
        }}
      >
        {phase === "chat" && (
          <ChatInterface
            selectedPdfCollections={selectedPdfCollections}
            selectedChatCollections={selectedChatCollections}
            pendingQuestion={pendingQuestion}
            onPendingQuestionConsumed={() => setPendingQuestion("")}
          />
        )}
      </div>
    </div>
  );
}