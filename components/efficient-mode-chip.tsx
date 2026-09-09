"use client";

/** MS-247 "Efficient Mode" toggle — same pill visual language as
 * SourceChip/the "Gap Check" button in chat-composer.tsx, but its own
 * tiny component (no count/items popover to carry) so the whole
 * experiment stays easy to remove. */
interface EfficientModeChipProps {
  active: boolean;
  onToggle: () => void;
}

export function EfficientModeChip({ active, onToggle }: EfficientModeChipProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`Efficient mode, ${active ? "active" : "inactive"}`}
      title="Efficient Mode — caveman-inspired context compression (experimental)"
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold font-['Manrope'] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span
        className="material-symbols-outlined text-[12px] leading-none"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        bolt
      </span>
      Efficient
    </button>
  );
}
