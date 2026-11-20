import { LensGuideStarters } from "@/features/chat/components/lens-guide/starters";

interface ChatEmptyStateProps {
  /** Puts a starter sentence in the composer for the user to finish. */
  onStart: (text: string) => void;
}

/** Welcome screen shown before the first message (Lens Guide mockup state 1):
 * plain chat, with starters as shortcuts. Ambient glow orbs echo the landing
 * page/hero glow language, empty state only, never behind an active thread. */
export function ChatEmptyState({ onStart }: ChatEmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center">
      <div className="fixed top-24 right-[12%] w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none z-0" />
      <div className="fixed bottom-20 left-[8%] w-80 h-80 rounded-full bg-primary/[0.05] blur-[110px] pointer-events-none z-0" />
      <h2 className="relative mb-3 font-manrope text-2xl font-extrabold tracking-tight text-foreground sm:text-[32px] sm:leading-tight">
        Mau mengerjakan apa?
      </h2>
      <p className="relative mb-7 max-w-md font-inter text-[15px] leading-relaxed text-muted-foreground">
        Tanya seperti biasa. Saya jawab dari dokumen yang boleh kamu buka, dan tunjukkan letaknya.
      </p>
      <div className="relative">
        <LensGuideStarters onStart={onStart} />
      </div>
      <p className="relative mt-6 font-inter text-[11px] text-muted-foreground/50">
        Ketik <span className="font-mono font-semibold">/</span> di kolom chat untuk lihat command (Collections, Usage, dll)
      </p>
    </div>
  );
}
