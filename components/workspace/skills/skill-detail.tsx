"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { AlertCircle, ArrowLeft, Loader2, Lock, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillAccess } from "./skill-access";
import { SkillDetailsFields } from "./skill-details-fields";
import { skillDetailsSchema, type SkillDetailsValues } from "./skill-details-schema";

interface SkillDetailProps {
  skill: Skill;
  isOwner: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onUpdated: (skill: Skill, change: "access" | "details") => void;
  onDeleted: (skill: Skill) => void;
}

export function SkillDetail({ skill, isOwner, isAdmin, onBack, onUpdated, onDeleted }: SkillDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("overview");
  const editRequestedRef = useRef(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const detailsForm = useForm<SkillDetailsValues>({
    resolver: zodResolver(skillDetailsSchema),
    defaultValues: { name: skill.name, description: skill.description },
  });

  function beginEdit() {
    if (busy || !isOwner) return;
    detailsForm.reset({ name: skill.name, description: skill.description });
    setError(null);
    setTab("overview");
    editRequestedRef.current = true;
    setEditing(true);
  }

  function finishEdit() {
    setEditing(false);
    setError(null);
    menuTriggerRef.current?.focus();
  }

  async function saveDetails(values: SkillDetailsValues) {
    if (busy || !isOwner) return;
    setBusy(true);
    setError(null);
    try {
      // Only send editable metadata; renaming never regenerates the command.
      onUpdated(await SkillApi.update(skill.skill_id, values), "details");
      finishEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changeScope(scope: SkillScope) {
    if (busy || !isAdmin || !isOwner || scope === skill.scope) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(await SkillApi.update(skill.skill_id, { scope }), "access");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update access. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !isOwner) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await SkillApi.remove(skill.skill_id);
      setConfirmDelete(false);
      onDeleted(skill);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete this skill. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={busy} className="-ml-3 gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Skills
      </Button>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 font-mono text-xl text-primary">/</span>
        <div className="min-w-0 flex-1">
          <h2 className="break-words font-['Manrope'] text-xl font-extrabold">{skill.name}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isOwner ? "Uploaded by you" : "Shared by your admin"}
            {skill.updated_at && dayjs(skill.updated_at).isValid() && ` · ${dayjs(skill.updated_at).format("DD MMM YYYY")}`}
          </p>
        </div>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button ref={menuTriggerRef} variant="ghost" size="icon" disabled={busy || editing} aria-label="Skill options" className="h-8 w-8 shrink-0 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl" onCloseAutoFocus={(event) => {
              if (editRequestedRef.current) {
                event.preventDefault();
                editRequestedRef.current = false;
                detailsForm.setFocus("name");
              }
            }}>
              <DropdownMenuItem onSelect={beginEdit} className="gap-2"><Pencil className="h-4 w-4" /> Edit details</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => { setDeleteError(null); setConfirmDelete(true); }} className="gap-2"><Trash2 className="h-4 w-4" /> Delete skill</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList className="w-full justify-start gap-4 rounded-none border-b border-border/60 bg-transparent p-0">
          {(["overview", "instructions"] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="h-10 flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-3 font-['Manrope'] font-bold capitalize text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent">{tab === "overview" ? "Overview" : "Instructions"}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="space-y-5">
          {editing ? (
            <form onSubmit={detailsForm.handleSubmit(saveDetails)} className="space-y-5">
              <h3 className="font-['Manrope'] text-sm font-bold">Edit details</h3>
              <SkillDetailsFields control={detailsForm.control} disabled={busy} />
              <div className="space-y-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">Slash command</span>
                  <code className="max-w-full break-all rounded-md bg-primary/10 px-2.5 py-1 text-sm text-primary">{skill.slash_command}</code>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Renaming this skill keeps its command the same.</p>
              </div>
              {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
              <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
                <Button type="button" variant="ghost" disabled={busy} onClick={finishEdit}>Cancel</Button>
                <Button type="submit" disabled={busy || !detailsForm.formState.isDirty} className="gap-2 rounded-lg font-['Manrope'] font-bold">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
          <>
          {skill.description.trim() && <p className="break-words text-sm leading-6 text-muted-foreground">{skill.description}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
            <span className="text-sm font-medium">Slash command</span>
            <code className="max-w-full break-all rounded-md bg-primary/10 px-2.5 py-1 text-sm text-primary">{skill.slash_command}</code>
          </div>
          <section className="space-y-3" aria-label="Skill access">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Who can use this skill?</h3>
              {busy && !confirmDelete && <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>}
            </div>
            {isOwner && isAdmin ? <SkillAccess value={skill.scope} onChange={(scope) => void changeScope(scope)} disabled={busy} /> : (
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                {skill.scope === "team" ? <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-semibold">{skill.scope === "team" ? "Entire team" : "Only you"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{isOwner ? "This skill is private to your account." : "Your admin manages this skill. Everyone on the team can use it."}</p>
                </div>
              </div>
            )}
            {isOwner && isAdmin && <p className="text-xs leading-5 text-muted-foreground">Access changes are saved automatically.</p>}
            {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          </section>
          </>
          )}
        </TabsContent>
        <TabsContent value="instructions" className="space-y-3">
          <p className="text-sm text-muted-foreground">The instructions included in this skill.</p>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-card/60 p-4 font-mono text-xs leading-6">{skill.instruction}</pre>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={(value) => { if (!busy) setConfirmDelete(value); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Delete “{skill.name}”?</AlertDialogTitle>
            <AlertDialogDescription>{skill.scope === "team" ? "This removes the skill for you and every team member." : "This removes the skill from your account."} This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Deleting…" : "Delete skill"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
