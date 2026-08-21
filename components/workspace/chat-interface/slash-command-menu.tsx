import type { SlashCommand } from "./chat-types";

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  onSelect: (command: string) => void;
}

/** "/" command dropdown — shared by the active-chat composer and any other
 * input that wants the same shortcut menu (e.g. the Home hero input). */
export function SlashCommandMenu({ commands, onSelect }: SlashCommandMenuProps) {
  if (commands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] overflow-hidden z-40">
      {commands.map((cmd, idx) => (
        <button
          key={cmd.command}
          onClick={() => onSelect(cmd.command)}
          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-accent transition-colors ${
            idx === 0 ? "bg-accent/50" : ""
          }`}
        >
          <span className="text-sm font-['Manrope'] font-semibold text-foreground">
            {cmd.command}
          </span>
          <span className="text-xs text-muted-foreground font-['Inter'] text-right">
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}
