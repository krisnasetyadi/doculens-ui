"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { AlertCircle, ChevronRight, FileText, Loader2, Lock, Plus, Search, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillDetail } from "./skill-detail";
import { SkillUpload } from "./skill-upload";

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
    { value: "all", label: "All skills", count: skills.length },
    { value: "personal", label: "Personal", count: personalCount },
    { value: "team", label: "Team", count: skills.length - personalCount },
  ];

  return (
    <div ref={headingRef} tabIndex={-1} className="max-w-xl outline-none" aria-label="Skills settings">
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
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted ring-1 ring-border"><Sparkles className="h-4 w-4 text-primary" /></span>
                <h2 className="font-['Manrope'] text-xl font-extrabold">Skills</h2>
              </div>
              <Button disabled={loading} onClick={() => navigate({ kind: "upload" })} className="gap-2 rounded-lg font-['Manrope'] text-sm font-bold"><Plus className="h-4 w-4" /> Add skill</Button>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{isAdmin ? "Save reusable instructions for repeated workflows. Keep them private or share them with your team." : "Add your own instructions and find skills shared by your admin."}</p>
          </div>

          <div role="group" aria-label="Filter skills by access" className="flex min-h-9 flex-wrap items-center justify-start gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 font-['Manrope'] text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter === item.value ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"}`}
              >
                {item.label}<span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${filter === item.value ? "bg-primary/15" : "bg-muted"}`}>{item.count}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search skills" placeholder="Search by name or command…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 rounded-lg border-border/70 bg-card/50 pl-9 pr-9" />
            {query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>}
          </div>

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading skills…</div>
          ) : error ? (
            <div role="alert" className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold"><AlertCircle className="h-4 w-4 text-destructive" /> Skills could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Try again</Button>
            </div>
          ) : filteredSkills.length ? (
            <>
              <ul aria-label="Available skills" className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/50">
                {filteredSkills.map((skill) => (
                  <li key={skill.skill_id}>
                    <button type="button" onClick={() => navigate({ kind: "detail", skillId: skill.skill_id })} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:border-primary/20 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10"><FileText className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block truncate font-['Manrope'] text-sm font-bold text-foreground">{skill.name}</span>
                        {skill.description.trim() && <span className="line-clamp-1 break-words text-xs leading-5 text-muted-foreground">{skill.description}</span>}
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                          <code className="max-w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{skill.slash_command}</code>
                          <span className="text-xs text-muted-foreground/70">·</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{skill.scope === "team" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{skill.scope === "team" ? "Entire team" : "Only you"}</span>
                          {skill.updated_at && dayjs(skill.updated_at).isValid() && <span className="text-xs text-muted-foreground">· Updated {dayjs(skill.updated_at).format("D MMM")}</span>}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
              {skills.length < 4 && (
                <p className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Skills let you save reusable instructions. Use them to standardize workflows, tone, formatting, or repeated tasks.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
              <span className="mb-3 rounded-xl border border-border/60 bg-background p-3"><FileText className="h-5 w-5 text-primary" /></span>
              <h3 className="font-['Manrope'] text-sm font-bold">{search ? "No matching skills" : filter === "team" ? "No team skills yet" : filter === "personal" ? "No personal skills yet" : "Make DocuLens work your way"}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{search ? "Try another name or slash command." : filter === "team" && !isAdmin ? "Skills shared by your admin will appear here." : "Add a Markdown file with instructions you want to use again."}</p>
              {search ? <Button variant="ghost" size="sm" onClick={() => setQuery("")} className="mt-3 text-primary">Clear search</Button> : (filter !== "team" || isAdmin) && <Button variant="outline" size="sm" onClick={() => navigate({ kind: "upload" })} className="mt-4 gap-2 rounded-lg font-['Manrope'] font-bold"><Plus className="h-3.5 w-3.5" /> Add your first skill</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
