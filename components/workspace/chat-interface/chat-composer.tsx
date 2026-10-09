import { forwardRef } from "react";
import { ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceChip } from "@/components/source-chip";
import { EfficientModeChip } from "@/components/efficient-mode-chip";
import { useEfficientModeStore } from "@/stores/efficient-mode-store";
import { formatResetTime } from "@/lib/date";
import type { SourceInventory } from "@/hooks/use-source-inventory";
import type { AvailableModelsResponse, LLMProvider } from "@/services";
import type { RateLimitStatus } from "@/services/payments/type/subscription.type";
import type { TokenQuotaTierUsage } from "@/services/payments/type/subscription.type";
import { DEFAULT_GEMINI_MODEL, splitLeadingCommand, visibleSlashCommands, type SlashCommand } from "./chat-types";
import { SlashCommandMenu } from "./slash-command-menu";
import { ComposerEditor } from "./composer-editor";
import { IconButton } from "@/components/icon-button";
import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";
import { Notice, NoticeLead } from "@/components/notice";

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
  /** False on plans without Compliance Gap Check (Free) — the button is hidden. */
  gapCheckAvailable: boolean;
  rateLimit: RateLimitStatus | null;
  isMemberCapped: boolean;
  blockedQuota: TokenQuotaTierUsage | null;
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
    gapCheckAvailable,
    rateLimit,
    isMemberCapped,
    blockedQuota,
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
  const allCommands = [...visibleSlashCommands(gapCheckAvailable), ...skillCommands];
  // MS-247 "Efficient Mode" — isolated store, read here only for the
  // toggle chip's own visual state.
  const efficientModeEnabled = useEfficientModeStore((s) => s.enabled);
  const toggleEfficientMode = useEfficientModeStore((s) => s.toggle);

  return (
    <div
      ref={ref}
      className="absolute bottom-0 left-0 right-0 px-4 sm:px-[clamp(24px,8vw,120px)] pb-4 sm:pb-6 pt-12 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-30"
    >
      <div className="max-w-[920px] mx-auto pointer-events-auto space-y-2.5">
        {/* Toolbar row */}
        <div className="flex items-center gap-x-3 flex-wrap gap-y-2">
          {/* Source toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <SourceChip
              label="Files"
              icon="description"
              active={sources.toggles.pdf}
              count={sources.pdf.activeIds.length}
              items={sources.pdf.activeNames}
              onToggle={() => sources.toggle("pdf")}
              disabled={loading}
            />
            <SourceChip
              label="DB"
              icon="database"
              active={sources.toggles.db}
              count={sources.db.activeIds.length}
              items={sources.db.activeNames}
              onToggle={() => sources.toggle("db")}
              disabled={loading}
            />
            <SourceChip
              label="Chat"
              icon="chat_bubble"
              active={sources.toggles.chat}
              count={sources.chat.activeIds.length}
              items={sources.chat.activeNames}
              onToggle={() => sources.toggle("chat")}
              disabled={loading}
            />
            <SourceChip
              label="Drive"
              icon="link"
              active={sources.toggles.link}
              count={sources.link.activeIds.length}
              items={sources.link.activeNames}
              onToggle={() => sources.toggle("link")}
              disabled={loading}
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* MS-247 "Efficient Mode" — opt-in, isolated context-compression experiment */}
            <EfficientModeChip active={efficientModeEnabled} onToggle={toggleEfficientMode} disabled={loading} />
            {/* Gap Analysis skill trigger — opt-in, doesn't change default chat flow.
                Hidden on plans without it (Free) rather than shown and then refused. */}
            {gapCheckAvailable && (
              <button
                onClick={onGapCheckClick}
                disabled={loading}
                title="Compliance Gap Check"
                className="flex h-7 items-center gap-1.5 bg-muted hover:bg-accent transition-colors rounded-full px-2.5 text-[11px] font-bold font-manrope text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-muted disabled:hover:text-muted-foreground"
              >
                <span className="material-symbols-outlined text-[13px] leading-none">shield</span>
                Gap Check
              </button>
            )}
            {/* Model selector */}
            <div className="relative flex h-7 items-center gap-1.5 bg-muted rounded-full px-2.5 hover:bg-accent transition-colors">
              <span className="material-symbols-outlined text-[13px] text-muted-foreground">smart_toy</span>
              <select
                value={`${selectedProvider}::${selectedModel}`}
                onChange={(e) => {
                  const [provider, model] = e.target.value.split("::");
                  onModelChange(provider as LLMProvider, model);
                }}
                disabled={loading}
                className="appearance-none text-[11px] font-bold font-manrope text-muted-foreground bg-transparent border-none outline-none cursor-pointer max-w-[130px] pr-4 disabled:cursor-not-allowed disabled:opacity-50"
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
              <ChevronDown className="h-3 w-3 text-muted-foreground/60 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Input row */}
        <div className="relative">
          {/* The field stays typeable while a reply loads (the next prompt can be
              prepared), but a command picked from the menu would run on top of
              the question still being answered, so the menu waits. */}
          <SlashCommandMenu commands={loading ? [] : filteredCommands} onSelect={onRunSlashCommand} />
          {isBlocked && rateLimit?.blocked && (
            <Notice tone="warning" size="sm" className="mb-2.5">
              <NoticeLead>Batas token tercapai</NoticeLead>
              {rateLimit?.reset_at && `, coba lagi sekitar ${formatResetTime(rateLimit.reset_at)}`}
              . Ketik <code className="font-mono">/usage</code> buat detail.
            </Notice>
          )}
          {isBlocked && !rateLimit?.blocked && blockedQuota && (
            <Notice tone="warning" size="sm" className="mb-2.5">
              <NoticeLead>{blockedQuota.interval[0].toUpperCase() + blockedQuota.interval.slice(1)} quota reached</NoticeLead>
              {`, resets ${formatResetTime(blockedQuota.next_reset_date)}`}. Ketik <code className="font-mono">/usage</code> buat detail.
            </Notice>
          )}
          {isBlocked && !rateLimit?.blocked && !blockedQuota && isMemberCapped && (
            <Notice tone="warning" size="sm" className="mb-2.5">
              <NoticeLead>Batas penggunaan token untuk periode ini telah tercapai.</NoticeLead>{" "}
              <Button
                type="button"
                variant="link"
                onClick={requestMoreTokens}
                disabled={requestingMoreTokens || tokenRequestSent}
              >
                {tokenRequestSent ? "Request sent ✓" : requestingMoreTokens ? "Sending…" : "Request more tokens"}
              </Button>
            </Notice>
          )}
          <Panel className={cn("transition-colors duration-200", input && "border-primary/30")}>
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
              <IconButton
                label="Send message"
                variant="default"
                onClick={() => onSubmit()}
                loading={loading}
                disabled={!input.trim() || isBlocked}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </IconButton>
            </ComposerEditor>
          </Panel>
        </div>
      </div>
    </div>
  );
});
