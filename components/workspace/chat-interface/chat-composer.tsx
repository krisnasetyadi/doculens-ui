import { forwardRef } from "react";
import { AlertCircle, ChevronDown, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceChip } from "@/components/source-chip";
import { EfficientModeChip } from "@/components/efficient-mode-chip";
import { useEfficientModeStore } from "@/stores/efficient-mode-store";
import { formatResetTime } from "@/lib/date";
import type { SourceInventory } from "@/hooks/use-source-inventory";
import type { AvailableModelsResponse, LLMProvider, RateLimitStatus } from "@/services";
import { DEFAULT_GEMINI_MODEL, SLASH_COMMANDS, splitLeadingCommand, type SlashCommand } from "./chat-types";
import { SlashCommandMenu } from "./slash-command-menu";
import { ComposerEditor } from "./composer-editor";

interface ChatComposerProps {
  sources: SourceInventory;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  filteredCommands: SlashCommand[];
  onRunSlashCommand: (command: string) => void;
  // MS-252: this account's Skills, shaped for the "/" menu — also used here
  // to tell a real skill invocation ("/weekly-report <message>", which hits
  // the metered LLM endpoint) apart from a free static command, so rate
  // limiting isn't bypassable by just prefixing a question with "/skill ".
  skillCommands: SlashCommand[];
  selectedProvider: LLMProvider;
  selectedModel: string;
  onModelChange: (provider: LLMProvider, model: string) => void;
  availableModels: AvailableModelsResponse | null;
  onGapCheckClick: () => void;
  rateLimit: RateLimitStatus | null;
  isMemberCapped: boolean;
  requestMoreTokens: () => void;
  requestingMoreTokens: boolean;
  tokenRequestSent: boolean;
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
    skillCommands,
    selectedProvider,
    selectedModel,
    onModelChange,
    availableModels,
    onGapCheckClick,
    rateLimit,
    isMemberCapped,
    requestMoreTokens,
    requestingMoreTokens,
    tokenRequestSent,
  },
  ref,
) {
  // Static commands (e.g. "/usage") still run client-side and never hit the
  // rate-limited query endpoint, so only block plain-question sends. A Skill
  // invocation ("/weekly-report <message>") is NOT exempt — it's a real LLM
  // call — so only treat input as a free slash command when it isn't one.
  const { leadingCommand, hasSpace } = splitLeadingCommand(input);
  const isSkillInvocation = skillCommands.some((c) => c.command === leadingCommand) && hasSpace;
  const isSlashCommand = input.startsWith("/") && !isSkillInvocation;
  const isBlocked = (Boolean(rateLimit?.blocked) || isMemberCapped) && !isSlashCommand;

  // MS-252: the moment the leading token exactly matches a known command
  // (static or Skill), Claude-style — it lights up inline as you keep typing
  // the rest of the message. MS-391 moved the highlight itself into the
  // editor as a ProseMirror decoration (see composer-editor.tsx); this list
  // is just what it matches against.
  const allCommands = [...SLASH_COMMANDS, ...skillCommands];
  // MS-247 "Efficient Mode" — isolated store, read here only for the
  // toggle chip's own visual state.
  const efficientModeEnabled = useEfficientModeStore((s) => s.enabled);
  const toggleEfficientMode = useEfficientModeStore((s) => s.toggle);

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
            {/* MS-247 "Efficient Mode" — opt-in, isolated context-compression experiment */}
            <EfficientModeChip active={efficientModeEnabled} onToggle={toggleEfficientMode} />
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
          <SlashCommandMenu commands={filteredCommands} onSelect={onRunSlashCommand} />
          {isBlocked && rateLimit?.blocked && (
            <div className="flex items-center gap-1.5 px-2 pb-1.5 text-[11px] font-['Inter'] text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Batas token tercapai
              {rateLimit?.reset_at && ` — coba lagi sekitar ${formatResetTime(rateLimit.reset_at)}`}
              . Ketik <code className="font-mono">/usage</code> buat detail.
            </div>
          )}
          {isBlocked && !rateLimit?.blocked && isMemberCapped && (
            <div className="flex items-center gap-1.5 flex-wrap px-2 pb-1.5 text-[11px] font-['Inter'] text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Batas penggunaan token untuk periode ini telah tercapai.</span>
              <button
                type="button"
                onClick={requestMoreTokens}
                disabled={requestingMoreTokens || tokenRequestSent}
                className="font-bold underline decoration-dotted underline-offset-2 disabled:no-underline disabled:opacity-70"
              >
                {tokenRequestSent ? "Request sent ✓" : requestingMoreTokens ? "Sending…" : "Request more tokens"}
              </button>
            </div>
          )}
          <div className={`bg-card border rounded-2xl transition-all duration-200 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] ${
            input ? "border-primary/30" : "border-border"
          }`}>
            <ComposerEditor
              value={input}
              onChange={onInputChange}
              onSubmit={onSubmit}
              onEscape={() => {
                if (filteredCommands.length > 0) onInputChange("");
              }}
              canSubmit={Boolean(input.trim()) && !loading && !isBlocked}
              commands={allCommands}
              placeholder="Ask a follow-up, or type “/” for commands…"
            >
              <Button
                onClick={() => onSubmit()}
                disabled={!input.trim() || loading || isBlocked}
                size="icon"
                className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] transition-all disabled:opacity-30 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </ComposerEditor>
          </div>
        </div>
      </div>
    </div>
  );
});
