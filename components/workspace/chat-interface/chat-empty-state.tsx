import { SUGGESTED_QUESTIONS } from "./chat-types";

interface ChatEmptyStateProps {
  onAskSuggested: (question: string) => void;
}

/** Welcome screen shown before the first message — ambient glow orbs echo
 * the landing page/hero glow language, empty state only, never behind an
 * active thread. */
export function ChatEmptyState({ onAskSuggested }: ChatEmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-16 sm:py-24 text-center">
      <div className="fixed top-24 right-[12%] w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none z-0" />
      <div className="fixed bottom-20 left-[8%] w-80 h-80 rounded-full bg-primary/[0.05] blur-[110px] pointer-events-none z-0" />
      <div className="relative mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
      </div>
      <h2 className="relative font-['Manrope'] text-xl font-bold text-foreground mb-2">Ask anything about your documents</h2>
      <p className="relative text-muted-foreground font-['Inter'] max-w-sm text-sm mb-6">Search across PDFs, databases, and chat logs using natural language</p>
      <div className="relative flex items-center justify-center gap-2 flex-wrap max-w-lg">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAskSuggested(q)}
            className="text-xs font-['Manrope'] font-bold text-foreground bg-card border border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] hover:border-primary/40 hover:bg-accent transition-all px-3.5 py-2 rounded-full"
          >
            {q}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/50 font-['Inter'] mt-5">
        Ketik <span className="font-mono font-semibold">/</span> di kolom chat untuk lihat command (Gap Check, Collections, History, dll)
      </p>
    </div>
  );
}
