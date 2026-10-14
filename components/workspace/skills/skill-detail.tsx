"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  CARD_CLASS,
  SECTION_TITLE_CLASS,
  SETTINGS_TITLE_CLASS,
} from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import {
} from "@/lib/menu-styles";
import { DeleteGlyph, DotsGlyph, MenuIcon, RenameGlyph } from "@/components/ui/menu-icons";
import { SkillApi } from "@/services/resources/skill-api";
import type { Skill, SkillScope } from "@/services/types";
import { SkillAccess } from "./skill-access";
import { SkillDetailsFields } from "./skill-details-fields";
import { skillDetailsSchema, type SkillDetailsValues } from "./skill-details-schema";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { IconButton } from "@/components/icon-button";
import { IconTile } from "@/components/icon-tile";
import { Notice } from "@/components/notice";
import { panelVariants } from "@/components/panel";

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
      <Button variant="ghost" size="sm" onClick={onBack} disabled={busy} className="-ml-3">
        <ArrowLeft className="h-4 w-4" /> Skills
      </Button>
      <div className="flex items-start gap-3">
        <IconTile className="font-mono text-lg">/</IconTile>
        <div className="min-w-0 flex-1">
          <h2 className={cn(SETTINGS_TITLE_CLASS, "break-words")}>{skill.name}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {isOwner ? "Uploaded by you" : "Shared by your admin"}
            {skill.updated_at && dayjs(skill.updated_at).isValid() && ` · ${dayjs(skill.updated_at).format("DD MMM YYYY")}`}
          </p>
        </div>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton ref={menuTriggerRef} size="sm" disabled={busy || editing} label="Skill options" ><DotsGlyph /></IconButton>
            </DropdownMenuTrigger>
            <ActionMenuContent onCloseAutoFocus={(event) => {
              if (editRequestedRef.current) {
                event.preventDefault();
                editRequestedRef.current = false;
                detailsForm.setFocus("name");
              }
            }}>
              <ActionMenuItem onSelect={beginEdit}><MenuIcon><RenameGlyph /></MenuIcon> Edit details</ActionMenuItem>
              <ActionMenuSeparator />
              <ActionMenuItem onSelect={() => { setDeleteError(null); setConfirmDelete(true); }} danger><MenuIcon danger><DeleteGlyph /></MenuIcon> Delete skill</ActionMenuItem>
            </ActionMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList className="w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
          {(["overview", "instructions"] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="-mb-px h-10 flex-none rounded-none border-0 border-b-2 border-transparent px-3 pb-2.5 font-manrope text-[11px] font-bold capitalize text-muted-foreground hover:text-primary-hover data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent">{tab === "overview" ? "Overview" : "Instructions"}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="space-y-5">
          {editing ? (
            <form onSubmit={detailsForm.handleSubmit(saveDetails)}>
              <FormFieldset busy={busy} className="block space-y-5">
                <h3 className={SECTION_TITLE_CLASS}>Edit details</h3>
                <SkillDetailsFields control={detailsForm.control} disabled={busy} />
                {error && <Notice role="alert" tone="error">{error}</Notice>}
                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="ghost" disabled={busy} onClick={finishEdit}>Cancel</Button>
                  <Button type="submit" loading={busy} loadingText="Saving…" disabled={!detailsForm.formState.isDirty}>
                    Save changes
                  </Button>
                </div>
              </FormFieldset>
            </form>
          ) : (
          <>
          {skill.description.trim() && <p className="break-words text-xs leading-relaxed text-muted-foreground">{skill.description}</p>}
          <div className={cn(CARD_CLASS, "flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
            <span className="text-xs font-semibold">Slash command</span>
            <code className="max-w-full break-all rounded-md bg-muted px-2.5 py-1 text-xs text-foreground">{skill.slash_command}</code>
          </div>
          <section className="space-y-3" aria-label="Skill access">
            <div className="flex items-center justify-between gap-2">
              <h3 className={SECTION_TITLE_CLASS}>Who can use this skill?</h3>
              {busy && !confirmDelete && <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>}
            </div>
            {isOwner && isAdmin ? <SkillAccess value={skill.scope} onChange={(scope) => void changeScope(scope)} disabled={busy} /> : (
              <div className={cn(CARD_CLASS, "flex items-start gap-3 p-4")}>
                {skill.scope === "team" ? <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <div>
                  <p className="text-[13px] font-semibold">{skill.scope === "team" ? "Entire team" : "Only you"}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{isOwner ? "This skill is private to your account." : "Your admin manages this skill. Everyone on the team can use it."}</p>
                </div>
              </div>
            )}
            {isOwner && isAdmin && <p className="text-[11px] leading-relaxed text-muted-foreground">Access changes are saved automatically.</p>}
            {error && <Notice role="alert" tone="error">{error}</Notice>}
          </section>
          </>
          )}
        </TabsContent>
        <TabsContent value="instructions" className="space-y-3">
          <p className="text-xs text-muted-foreground">The instructions included in this skill.</p>
          <pre className={cn(panelVariants({ padding: "md" }), "max-h-80 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-6")}>{skill.instruction}</pre>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={(value) => { if (!busy) setConfirmDelete(value); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Delete “{skill.name}”?</AlertDialogTitle>
            <AlertDialogDescription>{skill.scope === "team" ? "This removes the skill for you and every team member." : "This removes the skill from your account."} This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <Notice role="alert" tone="error">{deleteError}</Notice>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button loading={busy} loadingText="Deleting…" onClick={() => void remove()} variant="destructive">Delete skill</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
