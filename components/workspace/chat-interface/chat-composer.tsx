import { forwardRef } from "react";
import { ChevronDown, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceChip } from "@/components/source-chip";
import type { SourceInventory } from "@/hooks/use-source-inventory";
import type { AvailableModelsResponse, LLMProvider } from "@/services";
import { DEFAULT_GEMINI_MODEL, type SlashCommand } from "./chat-types";

interface ChatComposerProps {
  sources: SourceInventory;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  filteredCommands: SlashCommand[];
  onRunSlashCommand: (command: string) => void;
  selectedProvider: LLMProvider;
  selectedModel: string;
  onModelChange: (provider: LLMProvider, model: string) => void;
  availableModels: AvailableModelsResponse | null;
  onGapCheckClick: () => void;
}

/** Floating bottom bar: source toggles + gap-check + model select, then the
 * input row with the "/" command menu. Forwards its ref so the parent can
 * measure its rendered height (it floats over the thread, which needs to
 * reserve room for it — see ChatInterface's ResizeObserver). */
export const ChatComposer = forwardRef<HTMLDivElement, ChatComposerProps>(function ChatComposer(
  {
    sources,
    input,
    onInputChange,
    onSubmit,
    loading,
    filteredCommands,
    onRunSlashCommand,
    selectedProvider,
    selectedModel,
    onModelChange,
    availableModels,
    onGapCheckClick,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-4 sm:pb-6 pt-12 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-30"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto space-y-2">
        {/* Toolbar row */}
        <div className="flex items-center gap-2 px-1 flex-wrap gap-y-2">
          {/* Source toggles */}
          <div className="flex items-center gap-1 flex-wrap">
            <SourceChip
              label="Files"
              icon="description"
              active={sources.toggles.pdf}
              count={sources.pdf.activeIds.length}
              items={sources.pdf.activeNames}
              onToggle={() => sources.toggle("pdf")}
            />
            <SourceChip
              label="DB"
              icon="database"
              active={sources.toggles.db}
              count={sources.db.activeIds.length}
              items={sources.db.activeNames}
              onToggle={() => sources.toggle("db")}
            />
            <SourceChip
              label="Chat"
              icon="chat_bubble"
              active={sources.toggles.chat}
              count={sources.chat.activeIds.length}
              items={sources.chat.activeNames}
              onToggle={() => sources.toggle("chat")}
            />
            <SourceChip
              label="Drive"
              icon="link"
              active={sources.toggles.link}
              count={sources.link.activeIds.length}
              items={sources.link.activeNames}
              onToggle={() => sources.toggle("link")}
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Gap Analysis skill trigger — opt-in, doesn't change default chat flow */}
            <button
              onClick={onGapCheckClick}
              title="Compliance Gap Check"
              className="flex items-center gap-1.5 bg-muted hover:bg-accent transition-colors rounded-full px-2.5 py-1 text-[11px] font-bold font-['Manrope'] text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-[12px] leading-none">shield</span>
              Gap Check
            </button>
            {/* Model selector */}
            <div className="relative flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 hover:bg-accent transition-colors">
              <span className="material-symbols-outlined text-[12px] text-muted-foreground">smart_toy</span>
              <select
                value={`${selectedProvider}::${selectedModel}`}
                onChange={(e) => {
                  const [provider, model] = e.target.value.split("::");
                  onModelChange(provider as LLMProvider, model);
                }}
                className="appearance-none text-[11px] font-bold font-['Manrope'] text-muted-foreground bg-transparent border-none outline-none cursor-pointer max-w-[130px] pr-4"
              >
                {(
                  availableModels?.available_models?.["gemini"] ?? [
                    DEFAULT_GEMINI_MODEL,
                    "gemini-2.5-flash",
                    "gemini-2.5-pro",
                    "gemini-2.0-flash",
                  ]
                ).map((model) => (
                  <option key={`gemini::${model}`} value={`gemini::${model}`}>
                    {model.replace("gemini-", "Gemini ")}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60 absolute right-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Input row */}
        <div className="relative">
          {filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] overflow-hidden z-40">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.command}
                  onClick={() => onRunSlashCommand(cmd.command)}
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
          )}
          <div className={`flex items-center bg-card border rounded-2xl p-2 gap-2 transition-all duration-200 ${
            input ? "border-primary/30 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]" : "border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
          }`}>
            <Input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && filteredCommands.length > 0) {
                  onInputChange("");
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Ask a follow-up, or type “/” for commands…"
              className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm font-['Inter'] text-foreground placeholder:text-muted-foreground/40 py-3 h-auto px-2"
            />
            <Button
              onClick={() => onSubmit()}
              disabled={!input.trim() || loading}
              size="icon"
              className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] transition-all disabled:opacity-30 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
