"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { AuthApi } from "@/services/resources/auth-api";
import { SkillApi } from "@/services/resources/skill-api";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser, Skill, SkillScope, TeamMember, TeamMembersResponse } from "@/services/types";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  KeyRound,
  Loader2,
  Lock,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/form-password-input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getInitials } from "@/lib/utils";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
  resetMemberPasswordSchema,
  ResetMemberPasswordFormValues,
  addMemberSchema,
  AddMemberFormValues,
  updateNameSchema,
  UpdateNameFormValues,
} from "@/lib/validations/auth";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsCategory = "general" | "account" | "skills" | "team" | "billing";
const SETTINGS_CATEGORIES: SettingsCategory[] = ["general", "account", "skills", "team", "billing"];

/** Crop to a centered square and downscale to `size`x`size`, returned as a
 * JPEG data URL — keeps avatar uploads small enough to store inline on the
 * user row (no separate file storage / bucket needed for this). */
function resizeImageToDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read the image file."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Image resizing is not supported in this browser."));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Split an uploaded SKILL.md into frontmatter fields and body. The body is the
 * instruction that gets stored; name/command/description come from frontmatter
 * and fall back to the filename, so a plain .md with no frontmatter still
 * uploads instead of being rejected. */
function parseSkillMarkdown(raw: string, fileName: string) {
  const fallbackName = fileName.replace(/\.md$/i, "").trim() || "Untitled skill";
  const meta: Record<string, string> = {};
  let body = raw;

  const front = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (front) {
    body = raw.slice(front[0].length);
    for (const line of front[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  const name = meta.name || fallbackName;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return {
    name,
    // Server normalises the leading slash, so either shape in the file works.
    slash_command: meta.command || meta.slash_command || slug || "skill",
    description: meta.description || "",
    instruction: body.trim(),
  };
}

/** Inline "reset password" panel for one team member — rendered in a single,
 * predictable spot below the Add Member form (not a popover anchored to the
 * clicked row, which could land anywhere depending on scroll position).
 * Defined at module scope so its form state isn't torn down and recreated
 * on every SettingsModal render. */
function ResetMemberPasswordForm({
  member,
  onSubmit,
  onCancel,
}: {
  member: TeamMember;
  onSubmit: (userId: string, newPassword: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetMemberPasswordFormValues>({
    resolver: zodResolver(resetMemberPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  function handleSubmit(values: ResetMemberPasswordFormValues) {
    setError(null);
    setLoading(true);
    onSubmit(member.user_id, values.newPassword)
      .then(() => {
        form.reset();
        onCancel();
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to reset password.");
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center ring-1 ring-border shrink-0">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-['Manrope'] text-sm font-extrabold text-foreground">Reset password</p>
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
        <FormPasswordInput control={form.control} name="newPassword" label="New password" autoComplete="new-password" />
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={loading}
            className="rounded-lg font-['Manrope'] font-bold"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {loading ? "Resetting…" : "Reset password"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg font-['Manrope'] font-bold"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Claude-desktop-style settings: fixed left menu, scrollable content pane on
 * the right. Lives once at the workspace layout level (MS-91 follow-up) so
 * both the sidebar footer menu and the header account menu can open the
 * same modal instead of navigating to a /settings page. */
export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [category, setCategory] = useState<SettingsCategory>("general");
  const didRestoreFromHash = useRef(false);

  // General: display name
  const [nameMsg, setNameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const nameForm = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  // General: avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Change own password
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const pwForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  // Admin: team members (users created under this admin, capped by package quota)
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [maxSubUsers, setMaxSubUsers] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const addForm = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { newEmail: "", newPw: "" },
  });
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);

  // Skills: uploaded instruction files (MS-251). Anyone can upload one for
  // themselves; only an admin can share one with the whole team, and the
  // server rejects a non-admin who tries — this flag only hides the control.
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillMsg, setSkillMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [skillUploading, setSkillUploading] = useState(false);
  const [skillBusyId, setSkillBusyId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  // Deleting a shared skill takes it away from everyone and there is no undo,
  // so it goes through the same confirm step chat deletion already uses.
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);
  // Which scope the file about to be picked should get. A ref, not state: it is
  // set and read within one user action (menu click -> file dialog -> upload),
  // so it never needs to survive a render, and a persistent "share" toggle
  // sitting next to the button would be an invisible mode you could forget.
  const pendingScopeRef = useRef<SkillScope>("personal");

  // A success notice that never leaves turns into permanent furniture; errors
  // stay put, since those the user may still need to read and act on.
  useEffect(() => {
    if (skillMsg?.type !== "ok") return;
    const timer = setTimeout(() => setSkillMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [skillMsg]);

  useEffect(() => {
    if (category !== "skills") {
      setSelectedSkillId(null);
      setSkillMsg(null);
    }
  }, [category]);

  useEffect(() => {
    if (!open) return;
    setSkillsLoading(true);
    SkillApi.list<Skill[]>()
      .then((rows) => setSkills(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || user?.role !== "admin") return;
    setMembersLoading(true);
    AuthApi.adminUsers<TeamMembersResponse>()
      .then((res) => {
        setMembers(res.members);
        setMaxSubUsers(res.max_sub_users);
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [user?.role, open]);

  // Prefill the display-name field whenever the stored profile changes
  // (e.g. the one-time /auth/me refresh in the layout resolves after mount).
  useEffect(() => {
    if (open) nameForm.reset({ name: user?.name ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.name]);

  // Restore the open modal + active tab from the URL hash on first mount,
  // so a page refresh while Settings is open doesn't silently close it.
  useEffect(() => {
    const match = window.location.hash.match(/^#settings\/([a-z]+)$/);
    const parsed = match?.[1] as SettingsCategory | undefined;
    if (!parsed || !SETTINGS_CATEGORIES.includes(parsed)) return;
    if ((parsed === "team" || parsed === "billing") && !isAdmin) return;
    didRestoreFromHash.current = true;
    setCategory(parsed);
    onOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Land back on General each time the modal is opened by hand, and clear
  // any in-progress team-member reset — but skip this right after the
  // hash-restore effect above just opened it, so a refresh keeps its tab.
  useEffect(() => {
    if (!open) return;
    if (didRestoreFromHash.current) {
      didRestoreFromHash.current = false;
      return;
    }
    setCategory("general");
    setResetTarget(null);
  }, [open]);

  // Keep the URL hash in sync with the open modal + active tab so a refresh
  // lands back on the same one; clear it once the modal closes.
  useEffect(() => {
    if (open) {
      window.history.replaceState(null, "", `#settings/${category}`);
    } else if (window.location.hash.startsWith("#settings")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [open, category]);

  // Success banners auto-dismiss after a few seconds — errors stay put since
  // the user needs time to read and correct the input.
  useEffect(() => {
    if (nameMsg?.type !== "ok") return;
    const t = setTimeout(() => setNameMsg(null), 3000);
    return () => clearTimeout(t);
  }, [nameMsg]);

  useEffect(() => {
    if (pwMsg?.type !== "ok") return;
    const t = setTimeout(() => setPwMsg(null), 3000);
    return () => clearTimeout(t);
  }, [pwMsg]);

  useEffect(() => {
    if (addMsg?.type !== "ok") return;
    const t = setTimeout(() => setAddMsg(null), 3000);
    return () => clearTimeout(t);
  }, [addMsg]);

  function handleSaveName(values: UpdateNameFormValues) {
    setNameMsg(null);
    setNameSaving(true);
    AuthApi.updateProfile<AuthUser>({ name: values.name })
      .then((profile) => {
        updateUser(profile);
        setNameMsg({ type: "ok", text: "Display name updated." });
      })
      .catch((err: unknown) => {
        setNameMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to update name." });
      })
      .finally(() => setNameSaving(false));
  }

  function openSkillPicker(scope: SkillScope) {
    pendingScopeRef.current = isAdmin ? scope : "personal";
    setSkillMsg(null);
    skillInputRef.current?.click();
  }

  function handleSkillFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.md$/i.test(file.name)) {
      setSkillMsg({ type: "err", text: "Please choose a .md file." });
      return;
    }
    if (file.size > 256 * 1024) {
      setSkillMsg({ type: "err", text: "Skill file is too large (max 256KB)." });
      return;
    }
    setSkillMsg(null);
    setSkillUploading(true);
    file
      .text()
      .then((raw) => {
        const parsed = parseSkillMarkdown(raw, file.name);
        if (!parsed.instruction) {
          throw new Error("That file has no instruction text below its frontmatter.");
        }
        return SkillApi.create<Skill>({ ...parsed, scope: pendingScopeRef.current });
      })
      .then((created) => {
        setSkills((prev) => [created, ...prev]);
        setSkillMsg({ type: "ok", text: `"${created.name}" uploaded.` });
      })
      .catch((err: unknown) => {
        setSkillMsg({ type: "err", text: err instanceof Error ? err.message : "Upload failed." });
      })
      .finally(() => setSkillUploading(false));
  }

  function handleDeleteSkill(skill: Skill) {
    setSkillToDelete(null);
    setSkillBusyId(skill.skill_id);
    setSkillMsg(null);
    SkillApi.remove(skill.skill_id)
      .then(() => {
        setSkills((prev) => prev.filter((s) => s.skill_id !== skill.skill_id));
        setSelectedSkillId((cur) => (cur === skill.skill_id ? null : cur));
        setSkillMsg({ type: "ok", text: `"${skill.name}" deleted.` });
      })
      .catch((err: unknown) => {
        setSkillMsg({ type: "err", text: err instanceof Error ? err.message : "Delete failed." });
      })
      .finally(() => setSkillBusyId(null));
  }

  /** The only edit this ticket needs: who a skill you own is shared with. */
  function handleToggleSkillScope(skill: Skill, shared: boolean) {
    setSkillBusyId(skill.skill_id);
    setSkillMsg(null);
    SkillApi.update<Skill>(skill.skill_id, { scope: shared ? "team" : "personal" })
      .then((updated) => {
        setSkills((prev) => prev.map((s) => (s.skill_id === updated.skill_id ? updated : s)));
      })
      .catch((err: unknown) => {
        setSkillMsg({ type: "err", text: err instanceof Error ? err.message : "Update failed." });
      })
      .finally(() => setSkillBusyId(null));
  }

  function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("Image is too large (max 8MB).");
      return;
    }
    setAvatarError(null);
    setAvatarUploading(true);
    resizeImageToDataUrl(file, 256)
      .then((dataUrl) => AuthApi.updateProfile<AuthUser>({ avatar_url: dataUrl }))
      .then((profile) => updateUser(profile))
      .catch((err: unknown) => {
        setAvatarError(err instanceof Error ? err.message : "Failed to update photo.");
      })
      .finally(() => setAvatarUploading(false));
  }

  function handleRemoveAvatar() {
    setAvatarError(null);
    setAvatarRemoving(true);
    AuthApi.updateProfile<AuthUser>({ remove_avatar: true })
      .then((profile) => updateUser(profile))
      .catch((err: unknown) => {
        setAvatarError(err instanceof Error ? err.message : "Failed to remove photo.");
      })
      .finally(() => setAvatarRemoving(false));
  }

  function handleChangePw(values: ChangePasswordFormValues) {
    setPwMsg(null);
    setPwLoading(true);
    AuthApi.changePassword({ current_password: values.current, new_password: values.next })
      .then(() => {
        setPwMsg({ type: "ok", text: "Password updated successfully." });
        pwForm.reset();
      })
      .catch((err: unknown) => {
        setPwMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to update password." });
      })
      .finally(() => {
        setPwLoading(false);
      });
  }

  function handleResetMemberPassword(userId: string, newPassword: string) {
    return AuthApi.adminResetPassword({ user_id: userId, new_password: newPassword }).then(() => {
      toast({
        title: "Password reset",
        description: "The member can now sign in with the new password.",
        variant: "success",
      });
    });
  }

  function handleToggleStatus(member: TeamMember, nextActive: boolean) {
    setStatusLoadingId(member.user_id);
    AuthApi.setAdminUserStatus<{ status: string; user_id: string; active: boolean }>({
      user_id: member.user_id,
      active: nextActive,
    })
      .then((res) => {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === res.user_id ? { ...m, is_active: res.active } : m))
        );
      })
      .catch(() => {})
      .finally(() => setStatusLoadingId(null));
  }

  function handleCancelAdd() {
    addForm.reset();
    setAddMsg(null);
  }

  function handleAddMember(values: AddMemberFormValues) {
    setAddMsg(null);
    setAddLoading(true);
    AuthApi.addAdminUser<TeamMember>({ email: values.newEmail, password: values.newPw })
      .then((created) => {
        setMembers((prev) => [created, ...prev]);
        setAddMsg({ type: "ok", text: `User ${values.newEmail} added.` });
        addForm.reset();
      })
      .catch((err: unknown) => {
        setAddMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to add user." });
      })
      .finally(() => {
        setAddLoading(false);
      });
  }

  const activeMemberCount = members.filter((m) => m.is_active).length;
  const atLimit = activeMemberCount >= maxSubUsers;
  const selectedSkill = skills.find((sk) => sk.skill_id === selectedSkillId) ?? null;
  // "5 members" reads far more concretely than "the team" when you are about
  // to hand a skill to other people. Only admins have the roster loaded.
  const memberCountLabel = activeMemberCount > 0
    ? `${activeMemberCount} member${activeMemberCount === 1 ? "" : "s"}`
    : "";
  const skillQuery = skillSearch.trim().toLowerCase();
  const visibleSkills = skillQuery
    ? skills.filter((sk) =>
        `${sk.name} ${sk.slash_command} ${sk.description}`.toLowerCase().includes(skillQuery),
      )
    : skills;

  const menuItems: { key: SettingsCategory; label: string; icon: typeof Lock }[] = [
    { key: "general", label: "General", icon: User },
    { key: "account", label: "Account", icon: Lock },
    { key: "skills", label: "Skills", icon: Sparkles },
    ...(isAdmin
      ? [
          { key: "team" as const, label: "Team Members", icon: Users },
          { key: "billing" as const, label: "Billing", icon: CreditCard },
        ]
      : []),
  ];

  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="p-0 gap-0 flex max-w-[min(1040px,calc(100%-2rem))] sm:max-w-[min(1040px,calc(100%-2rem))] w-full h-[min(780px,88vh)] overflow-hidden rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* Fixed left menu */}
        <div className="w-64 shrink-0 border-r border-border/60 bg-muted/30 flex flex-col py-8 px-4">
          <p className="px-3 mb-5 font-['Manrope'] text-xl font-extrabold text-foreground">Settings</p>
          <nav className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = category === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-['Manrope'] text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content pane */}
        <div className="flex-1 overflow-y-auto px-10 py-10">
          {category === "general" && (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Profile</h2>
                  <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">Your name and photo, shown across the workspace.</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user?.avatar_url} alt={displayName} />
                    <AvatarFallback className="bg-primary/15 text-primary font-['Manrope'] font-extrabold text-lg">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {user?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarRemoving}
                      aria-label="Remove photo"
                      title="Remove photo"
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      {avatarRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={avatarUploading || avatarRemoving}
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-lg font-['Manrope'] font-bold"
                  >
                    {avatarUploading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    {avatarUploading ? "Uploading…" : "Change photo"}
                  </Button>
                  {avatarError ? (
                    <p className="text-xs text-destructive">{avatarError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-['Inter']">JPG or PNG, square photos work best.</p>
                  )}
                </div>
              </div>

              <form onSubmit={nameForm.handleSubmit(handleSaveName)} className="space-y-4">
                {nameMsg && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${nameMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}
                  >
                    {nameMsg.type === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {nameMsg.text}
                  </p>
                )}
                <FormInput control={nameForm.control} name="name" label="Display name" autoComplete="name" />
                <Button
                  type="submit"
                  disabled={nameSaving}
                  className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
                >
                  {nameSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {nameSaving ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </div>
          )}

          {category === "skills" && (
            <div className="space-y-6">
              <input
                ref={skillInputRef}
                type="file"
                accept=".md,text/markdown"
                className="hidden"
                onChange={handleSkillFileChange}
              />

              {selectedSkill ? (
                (() => {
                  const sk = selectedSkill;
                  const isOwner = sk.owner_id === user?.user_id;
                  const isShared = sk.scope === "team";
                  const canShareToTeam = isOwner && isAdmin;
                  const busy = skillBusyId === sk.skill_id;
                  return (
                    <div className="space-y-7 max-w-3xl">
                      <button
                        type="button"
                        onClick={() => setSelectedSkillId(null)}
                        className="flex items-center gap-1.5 text-sm font-['Manrope'] font-bold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Skills
                      </button>

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center">
                            <span className="font-mono text-lg font-bold text-primary leading-none">/</span>
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-['Manrope'] text-2xl font-extrabold text-foreground truncate">{sk.name}</h2>
                            <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">
                              {isOwner ? "Uploaded by you" : "Shared by your admin"}
                              {sk.updated_at ? ` · ${dayjs(sk.updated_at).format("DD MMM YYYY")}` : ""}
                            </p>
                          </div>
                        </div>
                        {/* Nothing to manage on someone else's skill, so the menu
                            itself disappears rather than opening to one disabled
                            item — an owner-only affordance for an owner-only action. */}
                        {isOwner && (
                          <div className="shrink-0 flex items-center gap-2">
                            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={busy}
                                  aria-label={`${sk.name} options`}
                                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={6} className="w-44 rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => setSkillToDelete(sk)}
                                  className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete skill
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {/* Active tab reuses the sidebar's own active treatment
                          (tinted primary pill) so the sub-navigation reads as the
                          same system, not a second tab style bolted on. */}
                      <Tabs defaultValue="overview">
                        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border/60 bg-transparent p-0 pb-3">
                          <TabsTrigger
                            value="overview"
                            className="flex-none rounded-xl px-4 py-2 font-['Manrope'] text-sm font-bold text-foreground/70 transition-colors data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                          >
                            Overview
                          </TabsTrigger>
                          <TabsTrigger
                            value="instructions"
                            className="flex-none rounded-xl px-4 py-2 font-['Manrope'] text-sm font-bold text-foreground/70 transition-colors data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                          >
                            Instructions
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="pt-7 space-y-5">
                          <div className="grid gap-6 md:grid-cols-[1fr_300px] items-start">
                            <div className="space-y-2 min-w-0">
                              <p className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Description
                              </p>
                              <p
                                className={`font-sans text-[15px] leading-7 ${sk.description ? "text-foreground" : "text-muted-foreground"}`}
                              >
                                {sk.description || "No description was given for this skill."}
                              </p>
                            </div>

                            <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
                              <p className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Slash command
                              </p>
                              <code className="inline-block font-mono text-sm text-primary bg-primary/10 rounded-lg px-2.5 py-1">
                                {sk.slash_command}
                              </code>
                            </div>
                          </div>

                          {/* Full width, below both columns: sharing is the one
                              setting on this page, so it gets the whole row
                              rather than being squeezed into a side rail.

                              The switch is labelled by what it DOES ("Share with
                              all team members"), never by the state it is in.
                              Labelling it "Only you" made it ambiguous — turning
                              it on would read as making the skill private. The
                              current state belongs underneath, as a result. */}
                          <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-3">
                            <p className="font-['Manrope'] text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Who can use it
                            </p>

                            {/* The text never changes — it describes the
                                setting, not the state. Only the switch moves.
                                Copy that rewrites itself on every toggle makes
                                you re-read the row to work out what happened;
                                a fixed label plus a switch position does not. */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-start gap-2.5 min-w-0">
                                {canShareToTeam || isShared ? (
                                  <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                ) : (
                                  <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-sans text-[15px] font-semibold text-foreground">
                                    {canShareToTeam || isShared ? "All members" : "Only you"}
                                  </p>
                                  <p className="font-sans text-sm text-muted-foreground mt-0.5">
                                    {canShareToTeam || isShared
                                      ? "Everyone on the team can use this skill."
                                      : "Skills you upload stay on your account."}
                                  </p>
                                </div>
                              </div>
                              {canShareToTeam && (
                                <Switch
                                  checked={isShared}
                                  disabled={busy}
                                  onCheckedChange={(checked) => handleToggleSkillScope(sk, checked)}
                                  aria-label="Let everyone on the team use this skill"
                                  className="shrink-0"
                                />
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="instructions" className="pt-7 space-y-2.5">
                          <p className="font-sans text-sm text-muted-foreground">
                            This is what DocuLens follows when this skill runs.
                            {isOwner ? " To change it, upload the file again." : ""}
                          </p>
                          <pre className="text-[13px] leading-relaxed font-mono text-foreground/90 whitespace-pre-wrap break-words bg-muted/30 border border-border/60 rounded-xl px-5 py-4 max-h-[420px] overflow-y-auto">
                            {sk.instruction}
                          </pre>
                        </TabsContent>
                      </Tabs>
                    </div>
                  );
                })()
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Skills</h2>
                        <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">
                          Instruction files that extend what DocuLens can do.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {skills.length > 0 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search skills"
                            value={skillSearch}
                            onChange={(e) => setSkillSearch(e.target.value)}
                            className="pl-9 h-9 w-48 rounded-full bg-muted/40 border-border/60"
                          />
                        </div>
                      )}

                      {/* One option means a plain button; the menu only appears
                          when an admin actually has two destinations to pick. */}
                      {isAdmin ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              disabled={skillUploading}
                              className="group h-9 rounded-full font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
                            >
                              {skillUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                              ) : (
                                <Plus className="h-4 w-4 mr-1.5" />
                              )}
                              {skillUploading ? "Uploading…" : "Add skill"}
                              <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={8}
                            className="w-72 rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
                          >
                            <DropdownMenuLabel className="flex flex-col gap-0.5">
                              <span className="font-['Manrope'] font-bold">Upload a .md file</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                Its text becomes the skill&apos;s instructions.
                              </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openSkillPicker("team")}
                              className="gap-2.5 py-2.5 items-start"
                            >
                              <Users className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                              <span className="flex flex-col gap-0.5">
                                <span className="font-['Manrope'] font-semibold">For the whole team</span>
                                <span className="text-xs text-muted-foreground">
                                  Every member you added can use it.
                                </span>
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openSkillPicker("personal")}
                              className="gap-2.5 py-2.5 items-start"
                            >
                              <Lock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="flex flex-col gap-0.5">
                                <span className="font-['Manrope'] font-semibold">Just for me</span>
                                <span className="text-xs text-muted-foreground">
                                  Stays on your account only.
                                </span>
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          type="button"
                          disabled={skillUploading}
                          onClick={() => openSkillPicker("personal")}
                          className="h-9 rounded-full font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
                        >
                          {skillUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1.5" />
                          )}
                          {skillUploading ? "Uploading…" : "Add skill"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {skillMsg && (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${skillMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}
                    >
                      {skillMsg.type === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      {skillMsg.text}
                    </p>
                  )}

                  {skillsLoading ? (
                    <p className="text-sm text-muted-foreground font-['Inter'] flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading skills…
                    </p>
                  ) : visibleSkills.length > 0 ? (
                    <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                      {/* The row carries no actions of its own: the only thing you
                          can do from the list is open a skill, so the whole row is
                          that one button. Deleting and sharing live on the detail
                          page, where there is room to say what they do — a trash
                          can sitting here made the most destructive action the only
                          visible one, while opening the skill had no affordance at
                          all. */}
                      {visibleSkills.map((sk) => {
                        const isShared = sk.scope === "team";
                        return (
                          <li key={sk.skill_id}>
                            <button
                              type="button"
                              onClick={() => setSelectedSkillId(sk.skill_id)}
                              aria-label={`Open ${sk.name}`}
                              className="group w-full flex items-center gap-3 px-4 py-3 text-sm font-['Inter'] text-left hover:bg-muted/40 focus-visible:bg-muted/40 outline-none transition-colors"
                            >
                              {/* The slash is what you actually type, so it leads
                                  the row the way an avatar leads a member row. */}
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center">
                                <span className="font-mono text-sm font-bold text-primary leading-none">/</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground font-semibold truncate transition-colors group-hover:text-primary">
                                  {sk.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  <span className="font-mono">{sk.slash_command}</span>
                                  {sk.description ? ` · ${sk.description}` : ""}
                                </p>
                              </div>
                              {/* Icon + word, not a bare label: at a glance this
                                  has to read as "the team has this" vs "mine". */}
                              <span
                                className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isShared ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                              >
                                {isShared ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                <span className="hidden sm:inline">{isShared ? "Team" : "Only me"}</span>
                              </span>
                              {sk.updated_at && (
                                <span className="shrink-0 hidden md:inline text-xs text-muted-foreground tabular-nums">
                                  {dayjs(sk.updated_at).format("DD MMM YYYY")}
                                </span>
                              )}
                              {/* The one affordance that says "this opens" —
                                  faint until you are on the row. */}
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : skills.length > 0 ? (
                    <p className="text-sm text-muted-foreground font-['Inter']">No skill matches that search.</p>
                  ) : (
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-14 text-center">
                      <div className="rounded-2xl bg-muted/40 border border-border/50 p-4">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-['Manrope'] font-bold text-foreground">No skills yet</p>
                        <p className="text-sm text-muted-foreground font-['Inter'] max-w-sm">
                          Upload a .md file whose text tells DocuLens how to work through
                          your documents{isAdmin ? ", then choose whether your team gets it too." : "."}
                        </p>
                      </div>
                      <pre className="text-left text-[11px] leading-relaxed font-mono text-muted-foreground bg-background/60 border border-border/50 rounded-xl px-4 py-3 overflow-x-auto max-w-full">
{`---
name: Audit ISO 27001
command: /audit-iso
description: Cek dokumen terhadap klausul
---

Tinjau dokumen terhadap tiap klausul dan
sebutkan bukti kutipannya.`}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {category === "account" && (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-['Manrope'] text-sm font-bold text-foreground truncate">{user?.email}</p>
                    <p className="text-xs text-muted-foreground font-['Inter']">Signed in as</p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {isAdmin ? "Admin" : "Member"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Change password</h2>
                    <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">Update your current password.</p>
                  </div>
                </div>
                <Form {...pwForm}>
                  <form onSubmit={pwForm.handleSubmit(handleChangePw)} className="space-y-4">
                    {pwMsg && (
                      <p
                        role="status"
                        aria-live="polite"
                        className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${pwMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}
                      >
                        {pwMsg.type === "ok" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0" />
                        )}
                        {pwMsg.text}
                      </p>
                    )}
                    <FormPasswordInput
                      control={pwForm.control}
                      name="current"
                      label="Current password"
                      autoComplete="current-password"
                    />
                    <FormPasswordInput
                      control={pwForm.control}
                      name="next"
                      label="New password"
                      autoComplete="new-password"
                    />
                    <FormPasswordInput
                      control={pwForm.control}
                      name="confirm"
                      label="Confirm new password"
                      autoComplete="new-password"
                    />
                    <Button
                      type="submit"
                      disabled={pwLoading}
                      className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
                    >
                      {pwLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {pwLoading ? "Updating…" : "Update password"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          )}

          {category === "team" && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 font-['Manrope'] text-xl font-extrabold text-foreground">
                      Team members
                      <span className="font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                    </h2>
                    <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">
                      Users you&apos;ve added, up to your package&apos;s limit.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-['Manrope'] text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-full">
                  {activeMemberCount}/{maxSubUsers} used
                </span>
              </div>

              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddMember)} className="space-y-4 border-b border-border/60 pb-6">
                  {addMsg && (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${addMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}
                    >
                      {addMsg.type === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      {addMsg.text}
                    </p>
                  )}
                  {atLimit && !membersLoading && (
                    <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      User limit reached. Upgrade your package to add more users.
                    </p>
                  )}
                  <FormField
                    control={addForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New user email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="off" disabled={atLimit} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormPasswordInput
                    control={addForm.control}
                    name="newPw"
                    label="Password"
                    autoComplete="new-password"
                    disabled={atLimit}
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={addLoading || atLimit}
                      className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
                    >
                      {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {addLoading ? "Adding…" : "Add user"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={addLoading}
                      onClick={handleCancelAdd}
                      className="rounded-xl font-['Manrope'] font-bold"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>

              {resetTarget && (
                <ResetMemberPasswordForm
                  member={resetTarget}
                  onSubmit={handleResetMemberPassword}
                  onCancel={() => setResetTarget(null)}
                />
              )}

              {membersLoading ? (
                <p className="text-sm text-muted-foreground font-['Inter'] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading team members…
                </p>
              ) : members.length > 0 ? (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                  {members.map((m) => (
                    <li
                      key={m.user_id}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-['Inter'] hover:bg-muted/40 transition-colors"
                    >
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary font-['Manrope'] font-extrabold text-xs">
                          {m.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-semibold truncate">{m.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {dayjs(m.created_at).format("DD MMM YYYY")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {m.role}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget(m)}
                          className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-widest rounded-full"
                        >
                          Reset password
                        </Button>
                        {statusLoadingId === m.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Switch
                            checked={m.is_active}
                            onCheckedChange={(checked) => handleToggleStatus(m, checked)}
                            aria-label={m.is_active ? "Deactivate member" : "Activate member"}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground font-['Inter']">No team members yet.</p>
              )}
            </div>
          )}

          {category === "billing" && isAdmin && (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="flex items-center gap-2 font-['Manrope'] text-xl font-extrabold text-foreground">
                    Billing
                    <span className="font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                  </h2>
                  <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">Plans, invoices, and payment methods.</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
                <div className="rounded-2xl bg-muted/40 border border-border/50 p-4">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-['Manrope'] font-bold text-foreground">Manage your subscription</p>
                  <p className="text-sm text-muted-foreground font-['Inter'] mt-1 max-w-sm">
                    Invoices and saved payment methods will land here in a future update. For now,
                    upgrading or comparing plans happens on the pricing page.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/pricing");
                  }}
                  className="mt-1 font-['Manrope'] font-bold"
                >
                  View plans & pricing
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Same confirm step the app already uses before deleting a chat. It
          matters more here: a shared skill disappears for every member at once,
          and the delete is a real row removal, not an archive. */}
      <AlertDialog
        open={skillToDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSkillToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Manrope'] font-extrabold">Delete this skill?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans">
              &ldquo;{skillToDelete?.name}&rdquo; will be permanently deleted
              {skillToDelete?.scope === "team"
                ? memberCountLabel
                  ? `, and ${memberCountLabel} will lose access to it`
                  : ", and everyone on the team will lose access to it"
                : ""}
              . You can&apos;t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => skillToDelete && handleDeleteSkill(skillToDelete)}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
