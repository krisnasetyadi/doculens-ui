"use client";

import { TruncatedTooltip } from "@/components/truncated-tooltip";

interface SourceChipProps {
  label: string;
  icon: string;
  active: boolean;
  count: number;
  items: string[];
  onToggle: () => void;
  size?: "sm" | "md";
  /** E.g. while a reply is loading — the selection can't change mid-question. */
  disabled?: boolean;
  /** On a phone the pill is just its icon (and the count while on); the name stays in aria-label. For a crowded row. */
  iconOnMobile?: boolean;
}

export function SourceChip({ label, icon, active, count, items, onToggle, size = "sm", disabled = false, iconOnMobile = false }: SourceChipProps) {
  const hasItems = active && items.length > 0;
  const sizeClasses =
    size === "md"
      ? "h-7 px-2.5 text-[11px] gap-1.5"
      : "h-7 px-2.5 text-[11px] gap-1.5";

  return (
    <div className="relative group/chip">
      <TruncatedTooltip label={label}>
        <button
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={active}
          aria-label={`${label}, ${active ? "active" : "inactive"}${active ? `, ${count} selected` : ""}`}
          className={`inline-flex items-center font-bold font-manrope rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${iconOnMobile ? "max-sm:px-2" : ""} ${
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <span
            className="material-symbols-outlined leading-none"
            style={{ fontSize: 13, ...(active ? { fontVariationSettings: "'FILL' 1" } : {}) }}
          >
            {icon}
          </span>
          <span className={`max-w-[120px] truncate ${iconOnMobile ? "max-sm:hidden" : ""}`}>{label}</span>
          {active && (
            <span className="bg-primary-foreground/25 text-primary-foreground rounded-full px-1.5 text-[10px] leading-[14px] font-semibold">
              {count}
            </span>
          )}
        </button>
      </TruncatedTooltip>

      {hasItems && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/chip:block group-focus-within/chip:block z-50 w-max max-w-[260px]">
          <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-lg px-3 py-2 text-xs font-inter space-y-1">
            <p className="font-bold font-manrope text-[11px] uppercase tracking-[0.2em] text-primary">
              {count} active
            </p>
            {items.slice(0, 8).map((name, i) => (
              <TruncatedTooltip key={i} label={name}>
                <p className="truncate">{name}</p>
              </TruncatedTooltip>
            ))}
            {items.length > 8 && (
              <p className="text-muted-foreground/60">+{items.length - 8} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
