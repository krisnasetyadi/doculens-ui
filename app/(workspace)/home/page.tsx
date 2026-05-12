"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");

  const handleAsk = (question: string) => {
    if (!question.trim()) return;
    router.push(`/ask?q=${encodeURIComponent(question.trim())}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 pt-20 pb-16 flex flex-col items-center">
        {/* Greeting */}
        <div className="w-full mb-12 text-center">
          <h2 className="font-['Manrope'] text-4xl font-extrabold text-[#2a3439] tracking-tight mb-2">
            Good morning, Sarah.
          </h2>
          <p className="font-['Inter'] text-[#566166] text-lg">
            What intelligence can I uncover for you today?
          </p>
        </div>

        {/* Ask bar */}
        <div className="w-full relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0053db]/20 to-[#006b62]/20 rounded-xl blur opacity-25 group-focus-within:opacity-100 transition duration-1000" />
          <div className="relative flex items-center bg-white shadow-[0_12px_32px_-4px_rgba(42,52,57,0.08)] rounded-xl p-2">
            <div className="pl-4 pr-2 text-[#0053db]">
              <span className="material-symbols-outlined text-3xl">
                chat_bubble
              </span>
            </div>
            <Input
              className="flex-grow bg-transparent border-none shadow-none focus-visible:ring-0 text-xl font-['Inter'] text-[#2a3439] py-5 px-4 placeholder:text-[#717c82]/60 h-auto"
              placeholder="Ask anything about your projects, documentation, or team knowledge..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk(inputValue);
              }}
            />
            <Button
              onClick={() => handleAsk(inputValue)}
              size="icon"
              className="bg-gradient-to-br from-[#0053db] to-[#0048c1] text-white p-4 rounded-lg h-auto w-auto shadow-md hover:scale-105 active:scale-95 hover:from-[#0048c1] hover:to-[#003fa8]"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </Button>
          </div>
        </div>

        {/* Source indicators */}
        <div className="mt-10 flex flex-col items-center gap-5 w-full">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              {
                icon: "description",
                label: "PDF Documents",
                color: "#dbe1ff",
                text: "#0053db",
              },
              {
                icon: "database",
                label: "Databases",
                color: "#d5e3fc",
                text: "#0053db",
              },
              {
                icon: "chat_bubble",
                label: "Chat Corpora",
                color: "#e8eff3",
                text: "#455367",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#d9e4ea] bg-white/70"
              >
                <span
                  className="material-symbols-outlined text-base leading-none"
                  style={{ color: s.text }}
                >
                  {s.icon}
                </span>
                <span className="text-xs font-['Inter'] font-medium text-[#566166]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[#a9b4b9] max-w-lg w-full">
            <Separator className="flex-1 bg-[#d9e4ea]" />
            <span className="text-[11px] font-['Inter'] tracking-wide select-none whitespace-nowrap">
              Press{" "}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#f0f4f7] border border-[#d9e4ea] rounded text-[#566166]">
                ↵ Enter
              </kbd>{" "}
              to search across all sources
            </span>
            <Separator className="flex-1 bg-[#d9e4ea]" />
          </div>
        </div>
      </div>

      {/* Ambient blobs */}
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-[#dbe1ff]/20 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed top-24 right-[10%] w-64 h-64 bg-[#91feef]/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
    </div>
  );
}
