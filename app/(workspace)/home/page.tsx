"use client";

import { useState, useEffect, useMemo } from "react";
import { ChatInterface } from "@/components/workspace/chat-interface/chat-interface";
import { SlashCommandMenu } from "@/components/workspace/chat-interface/slash-command-menu";
import { ComposerEditor } from "@/components/workspace/chat-interface/composer-editor";
import { SLASH_COMMANDS, filterSlashCommands, splitLeadingCommand, toSkillCommands } from "@/components/workspace/chat-interface/chat-types";
import { SourceChip } from "@/components/source-chip";
import { useSourceInventory } from "@/hooks/use-source-inventory";
import { RetryNotice } from "@/components/retry-notice";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAuthStore } from "@/stores/auth-store";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill } from "@/services/types";
import { IconButton } from "@/components/icon-button";
import { Panel } from "@/components/panel";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getFirstName(name?: string, email?: string) {
  if (name && name.trim()) return capitalize(name.trim().split(" ")[0]);
  if (email) return capitalize(email.split("@")[0]);
  return "";
}

/** Keyed by the "New Chat" counter, so the sidebar can reset /home to a fresh hero without a route change. */
export default function HomePage() {
  const newChatNonce = useWorkspaceStore((s) => s.newChatNonce);
  return <HomeContent key={newChatNonce} />;
}

function HomeContent() {
  const { selectedPdfCollections, selectedChatCollections } = useWorkspaceStore();
  const setActiveSessionId = useWorkspaceStore((s) => s.setActiveSessionId);
  const user = useAuthStore((state) => state.user);
  const firstName = getFirstName(user?.name, user?.email);
  const sources = useSourceInventory();
  const [inputValue, setInputValue] = useState("");
  // "hero" | "transitioning" | "chat"
  const [phase, setPhase] = useState<"hero" | "transitioning" | "chat">("hero");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [pendingSkillId, setPendingSkillId] = useState<string | undefined>(undefined);

  // MS-388: /home's hero (before a message is sent) renders before
  // ChatInterface/useChatThread ever mounts — so the sidebar's
  // activeSessionId signal, normally cleared by that hook's own unmount
  // cleanup when leaving a session's page, can otherwise sit stale (pointing
  // at whatever session was open on the page navigated away from) for the
  // whole time the hero is showing. Clear it on arrival instead of waiting
  // for the chat layer to mount; appendUserMessage sets it again on send.
  useEffect(() => {
    setActiveSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MS-252: this account's Skills, fetched independently here the same way
  // useChatThread does for the active composer — the hero input renders
  // (and needs its own "/" menu) before ChatInterface/useChatThread ever
  // mounts, since the chat layer only appears after the hero transitions
  // out. Seeded from the workspace store's cache (same pattern as
  // hooks/use-chat-thread.ts) so a reload shows the last-known list
  // instantly instead of an empty "/" menu until this fetch resolves.
  const cachedSkills = useWorkspaceStore((s) => s.cachedSkills);
  const setCachedSkills = useWorkspaceStore((s) => s.setCachedSkills);
  const [skills, setSkills] = useState<Skill[]>(() => cachedSkills);
  useEffect(() => {
    let ignore = false;
    SkillApi.list()
      .then((rows) => {
        if (ignore) return;
        setSkills(rows);
        setCachedSkills(rows);
      })
      // Deliberately silent: skills only enrich the "/" menu, and the cached list (or none)
      // keeps working. The chat composer loads them again on its own mount.
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);
  const skillCommands = useMemo(() => toSkillCommands(skills), [skills]);

  const filteredCommands = filterSlashCommands(inputValue, skillCommands, SLASH_COMMANDS);

  // MS-252: the leading "/command" lights up as a chip once it exactly matches
  // a known command, via the same editor decoration the chat composer uses.
  const allCommands = useMemo(() => [...SLASH_COMMANDS, ...skillCommands], [skillCommands]);

  const handleAsk = (question: string, skillId?: string) => {
    if (!question.trim()) return;
    setPendingQuestion(question.trim());
    setPendingSkillId(skillId);
    setPhase("transitioning");
  };

  // "/" menu selection — a static command still asks immediately (unchanged).
  // A Skill instead just fills the input with "/command " so the user keeps
  // typing their message on the same line, mirroring the active composer's
  // selectSlashCommand (see hooks/use-chat-thread.ts). The editor moves the
  // caret to the end when the value is set from outside.
  const selectCommand = (command: string) => {
    const skillMatch = skills.find((s) => s.slash_command === command);
    if (skillMatch) {
      setInputValue(`${command} `);
      return;
    }
    handleAsk(command);
  };

  // Same leading-token interception as the active chat composer's
  // handleSubmit (see hooks/use-chat-thread.ts) — a Skill invoked inline
  // ("/weekly-report ringkas minggu ini") hands off the question text and
  // skill_id separately; a static command still asks immediately.
  const submit = () => {
    const trimmed = inputValue.trim();
    if (trimmed.startsWith("/")) {
      const { leadingCommand, remainder, hasSpace } = splitLeadingCommand(trimmed);

      const staticMatch = SLASH_COMMANDS.find((c) => c.command === leadingCommand);
      if (staticMatch) {
        handleAsk(staticMatch.command);
        return;
      }

      const skillMatch = skills.find((s) => s.slash_command === leadingCommand);
      if (skillMatch) {
        if (!remainder) return;
        handleAsk(remainder, skillMatch.skill_id);
        return;
      }

      if (filteredCommands.length > 0 && !hasSpace) {
        selectCommand(filteredCommands[0].command);
        return;
      }
    }
    handleAsk(inputValue);
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
      {/* ── Ambient orbs (hero phase only — ChatInterface supplies its own once chat mounts) ── */}
      <div
        className="fixed top-24 right-[12%] w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none transition-opacity duration-500"
        style={{ opacity: phase === "hero" ? 1 : 0 }}
      />
      <div
        className="fixed bottom-20 left-[8%] w-80 h-80 rounded-full bg-primary/[0.05] blur-[110px] pointer-events-none transition-opacity duration-500"
        style={{ opacity: phase === "hero" ? 1 : 0 }}
      />

      {/* ── HERO LAYER ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out"
        style={{
          opacity: phase === "hero" ? 1 : 0,
          transform: phase === "hero" ? "translateY(0)" : "translateY(-48px)",
          pointerEvents: phase === "hero" ? "auto" : "none",
        }}
      >
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 flex flex-col items-center gap-8">

          {/* Greeting */}
          <div
            className="text-center transition-all duration-300"
            style={{
              opacity: phase === "hero" ? 1 : 0,
              transform: phase === "hero" ? "translateY(0)" : "translateY(-16px)",
              transitionDelay: phase !== "hero" ? "0ms" : "0ms",
            }}
          >
            <h2 className="font-manrope text-[clamp(2rem,4vw,3rem)] font-extrabold text-foreground tracking-tight leading-[1.1] mb-2">
              {firstName ? (
                <>
                  {getGreeting()}, <span className="text-primary">{firstName}.</span>
                </>
              ) : (
                <>{getGreeting()}.</>
              )}
            </h2>
            <p className="font-inter text-muted-foreground">
              What intelligence can I uncover for you today?
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full">
            <div className="relative">
              <SlashCommandMenu commands={filteredCommands} onSelect={selectCommand} />
              <Panel className="group transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <ComposerEditor
                  size="hero"
                  autoFocus
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={submit}
                  onEscape={() => {
                    if (filteredCommands.length > 0) setInputValue("");
                  }}
                  canSubmit={Boolean(inputValue.trim())}
                  commands={allCommands}
                  placeholder="Ask anything across your knowledge base..."
                  leading={
                    <div className="pl-3 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        auto_awesome
                      </span>
                    </div>
                  }
                >
                  <IconButton
                    label="Send"
                    variant="default"
                    onClick={submit}
                    disabled={!inputValue.trim()}
                    className="shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </IconButton>
                </ComposerEditor>
              </Panel>
            </div>

            {/* Source chips */}
            <div
              className="flex items-center justify-center gap-2 mt-4 flex-wrap transition-all duration-300"
              style={{
                opacity: phase === "hero" ? 1 : 0,
                transform: phase === "hero" ? "translateY(0)" : "translateY(8px)",
              }}
            >
              <SourceChip
                label="Files"
                icon="description"
                active={sources.toggles.pdf}
                count={sources.pdf.activeIds.length}
                items={sources.pdf.activeNames}
                onToggle={() => sources.toggle("pdf")}
                size="md"
              />
              <SourceChip
                label="Databases"
                icon="database"
                active={sources.toggles.db}
                count={sources.db.activeIds.length}
                items={sources.db.activeNames}
                onToggle={() => sources.toggle("db")}
                size="md"
              />
              <SourceChip
                label="Chat Corpora"
                icon="chat_bubble"
                active={sources.toggles.chat}
                count={sources.chat.activeIds.length}
                items={sources.chat.activeNames}
                onToggle={() => sources.toggle("chat")}
                size="md"
              />
              <SourceChip
                label="Public Links"
                icon="link"
                active={sources.toggles.link}
                count={sources.link.activeIds.length}
                items={sources.link.activeNames}
                onToggle={() => sources.toggle("link")}
                size="md"
              />
            </div>
            {sources.loadFailed && phase === "hero" && (
              <div className="mt-3 flex justify-center">
                <RetryNotice size="sm" onRetry={sources.retryLoad} retrying={sources.retrying}>
                  Couldn&apos;t load your sources, so some chips may be missing.
                </RetryNotice>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <p
            className="text-xs text-muted-foreground/40 font-inter transition-all duration-200"
            style={{ opacity: phase === "hero" ? 1 : 0 }}
          >
            Press{" "}
            <kbd className="px-1.5 py-0.5 font-mono bg-muted border border-border rounded-sm text-[10px] text-muted-foreground">
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
            pendingSkillId={pendingSkillId}
            onPendingQuestionConsumed={() => {
              setPendingQuestion("");
              setPendingSkillId(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}