"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { AlertCircle, ChevronRight, FileText, Plus, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsHeader,
} from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillDetail } from "./skill-detail";
import { SkillTable, SkillTableSkeleton } from "./skill-table";
import { SkillUpload } from "./skill-upload";
import { IconButton } from "@/components/icon-button";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/icon-tile";
import { Panel } from "@/components/panel";

type SkillFilter = "all" | SkillScope;
type SkillView = { kind: "list" } | { kind: "upload" } | { kind: "detail"; skillId: string };

export function SkillsSettings({ active }: { active: boolean }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SkillFilter>("all");
  const [view, setView] = useState<SkillView>({ kind: "list" });
  const headingRef = useRef<HTMLDivElement>(null);
  const shouldFocusView = useRef(false);

  useEffect(() => {
    if (!active || !user?.user_id) return;
    let ignore = false;
    setLoading(true);
    setError(null);
    SkillApi.list()
      .then((rows) => { if (!ignore) setSkills(rows); })
      .catch((err: unknown) => { if (!ignore) setError(err instanceof Error ? err.message : "Could not load skills. Please try again."); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [active, user?.user_id, retry]);

  useEffect(() => {
    if (shouldFocusView.current) {
      headingRef.current?.focus({ preventScroll: true });
      const scrollParent = headingRef.current?.parentElement;
      if (scrollParent) scrollParent.scrollTop = 0;
      shouldFocusView.current = false;
    }
  }, [view]);

  function navigate(next: SkillView) {
    shouldFocusView.current = true;
    setView(next);
  }

  function updateSkill(updated: Skill, change: "access" | "details") {
    setSkills((current) => current.map((skill) => skill.skill_id === updated.skill_id ? updated : skill));
    toast(change === "details"
      ? { title: "Skill details updated", variant: "success" }
      : { title: "Access updated", description: updated.scope === "team" ? "Your entire team can now use this skill." : "This skill is now private to your account.", variant: "success" });
  }

  const selectedSkill = view.kind === "detail" ? skills.find((skill) => skill.skill_id === view.skillId) : undefined;
  const search = query.trim().toLowerCase();
  const filteredSkills = skills.filter((skill) => (filter === "all" || skill.scope === filter) && (!search || `${skill.name} ${skill.slash_command} ${skill.description}`.toLowerCase().includes(search)));
  const personalCount = skills.filter((skill) => skill.scope === "personal").length;
  const filters: { value: SkillFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: skills.length },
    { value: "personal", label: "Personal", count: personalCount },
    { value: "team", label: "Team", count: skills.length - personalCount },
  ];

  return (
    <div ref={headingRef} tabIndex={-1} className="max-w-2xl outline-none" aria-label="Skills settings">
      {view.kind === "upload" ? (
        <SkillUpload
          isAdmin={isAdmin}
          onBack={() => navigate({ kind: "list" })}
          onUploaded={(skill) => {
            setSkills((current) => [skill, ...current]);
            navigate({ kind: "detail", skillId: skill.skill_id });
            toast({ title: "Skill uploaded", description: skill.scope === "team" ? "Available to you and your entire team." : "Only you can use this skill.", variant: "success" });
          }}
        />
      ) : selectedSkill ? (
        <SkillDetail
          key={selectedSkill.skill_id}
          skill={selectedSkill}
          isOwner={selectedSkill.owner_id === user?.user_id}
          isAdmin={isAdmin}
          onBack={() => navigate({ kind: "list" })}
          onUpdated={updateSkill}
          onDeleted={(deleted) => {
            setSkills((current) => current.filter((skill) => skill.skill_id !== deleted.skill_id));
            navigate({ kind: "list" });
            toast({ title: "Skill deleted", variant: "success" });
          }}
        />
      ) : (
        <div className="space-y-8">
          <SettingsHeader
            icon={Sparkles}
            title="Skills"
            description="Reusable instructions you can keep private or share with your team."
            aside={
              <Button disabled={loading} onClick={() => navigate({ kind: "upload" })} className="shrink-0">
                <Plus className="h-4 w-4" /> Add skill
              </Button>
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter by access" className="inline-flex items-center gap-0.5 rounded-md border bg-card p-1 shadow-xs">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                  className={`flex h-7 items-center gap-1.5 rounded-md px-3 font-manrope text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter === item.value ? "bg-accent text-primary ring-1 ring-inset ring-primary/20" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {item.label}
                  <span className={`text-[10px] tabular-nums ${filter === item.value ? "text-primary/70" : "text-muted-foreground"}`}>{item.count}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-60">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search skills" placeholder="Search skills…" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9 pr-9" />
              {query && <IconButton size="sm" label="Clear search"  onClick={() => setQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5" /></IconButton>}
            </div>
          </div>

          {loading ? (
            <SkillTableSkeleton />
          ) : error ? (
            <div role="alert" className="space-y-3 rounded-lg border border-destructive/20 bg-danger-soft p-5">
              <p className="flex items-center gap-2 font-manrope text-[13px] font-bold"><AlertCircle className="size-4 text-danger-ink" /> Couldn't load skills</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Try again</Button>
            </div>
          ) : filteredSkills.length ? (
            <SkillTable>
              <ul aria-label="Available skills" className="divide-y divide-border">
                {filteredSkills.map((skill) => (
                  <li key={skill.skill_id}>
                    <button type="button" onClick={() => navigate({ kind: "detail", skillId: skill.skill_id })} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      <IconTile><FileText className="size-4" /></IconTile>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-manrope text-[13px] font-bold text-foreground">{skill.name}</span>
                        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                          <code className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">{skill.slash_command}</code>
                          {skill.description.trim() && <span className="truncate">{skill.description}</span>}
                        </span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-6 sm:flex">
                        <span className="w-14"><Badge variant="secondary">{skill.scope === "team" ? "Team" : "Private"}</Badge></span>
                        <span className="w-14 text-[11px] text-muted-foreground">{skill.updated_at && dayjs(skill.updated_at).isValid() ? dayjs(skill.updated_at).format("D MMM") : "—"}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            </SkillTable>
          ) : (
            <Panel tone="dashed" className="flex flex-col items-center px-5 py-10 text-center">
              <IconTile size="lg" className="mb-3"><FileText className="size-[18px]" /></IconTile>
              <h3 className="font-manrope text-[13px] font-bold">{search ? "No matching skills" : filter === "team" ? "No team skills yet" : filter === "personal" ? "No personal skills yet" : "Make DocuLens work your way"}</h3>
              <p className="mt-1.5 max-w-[250px] text-[11px] leading-relaxed text-muted-foreground">{search ? "Try another name or slash command." : filter === "team" && !isAdmin ? "Skills shared by your admin will appear here." : "Add a Markdown file with instructions you want to use again."}</p>
              {search ? <Button variant="link" onClick={() => setQuery("")} className="mt-3">Clear search</Button> : (filter !== "team" || isAdmin) && <Button variant="outline" onClick={() => navigate({ kind: "upload" })} className="mt-4"><Plus className="h-3.5 w-3.5" /> Add your first skill</Button>}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
