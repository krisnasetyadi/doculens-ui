"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { AuthApi } from "@/services/resources/auth-api";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser, TeamMember, TeamMembersResponse } from "@/services/types";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/form-password-input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

/** Shared empty-state block for tabs that are just a placeholder for now
 * (Skills, Billing) — icon-in-a-well + bold heading + muted subtext. */
function ComingSoonNotice({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
      <div className="rounded-2xl bg-muted/40 border border-border/50 p-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-['Manrope'] font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground font-['Inter'] mt-1 max-w-sm">{description}</p>
      </div>
    </div>
  );
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
        className="p-0 gap-0 flex max-w-[min(900px,calc(100%-2rem))] sm:max-w-[min(900px,calc(100%-2rem))] w-full h-[min(720px,85vh)] overflow-hidden rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
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
            <div className="max-w-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Skills</h2>
                  <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">Browse and manage skills available to your workspace.</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search skills (coming soon)" disabled className="pl-9" />
              </div>
              <ComingSoonNotice
                icon={Sparkles}
                title="Skill list coming soon"
                description="This will list the skills available to your workspace."
              />
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
    </Dialog>
  );
}
