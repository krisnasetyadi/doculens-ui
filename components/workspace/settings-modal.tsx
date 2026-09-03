"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { AuthApi } from "@/services/resources/auth-api";
import { PaymentApi } from "@/services/resources/payment-api";
import { useToast } from "@/hooks/use-toast";
import type {
  AuthUser,
  TeamMember,
  TeamMembersResponse,
  SubscriptionUsage,
  MemberTokenUsage,
  MyMemberUsageResponse,
  MembersUsageResponse,
  UpdateMemberAllocationResponse,
  TokenRequestRecord,
  TokenRequestsResponse,
} from "@/services/types";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CreditCard,
  Gauge,
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
import { Progress } from "@/components/ui/progress";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/form-password-input";
import { FormField as SharedFormField } from "@/components/forms/form-field";
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

type SettingsCategory = "general" | "account" | "usage" | "skills" | "team" | "billing";
const SETTINGS_CATEGORIES: SettingsCategory[] = ["general", "account", "usage", "skills", "team", "billing"];

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

/** One row of the "Member allocations" table — its own react-hook-form
 * instance (schema-first, via the shared `FormField` adapter per this
 * repo's forms convention) instead of the parent's onChange-into-a-dict
 * pattern, for two reasons: (1) validation lives in a zod schema instead
 * of hand-rolled checks, and (2) disabling the field while `saving` is
 * true makes a second submit impossible until the first resolves, so an
 * edit made mid-save can never be silently clobbered when that save's
 * response comes back and resets the field. Defined at module scope, same
 * reasoning as ResetMemberPasswordForm above. */
function MemberAllocationRow({
  member,
  isSelf,
  unallocatedTokens,
  saving,
  serverError,
  onSave,
}: {
  member: MemberTokenUsage;
  isSelf?: boolean;
  unallocatedTokens: number;
  saving: boolean;
  serverError?: string;
  onSave: (member: MemberTokenUsage, allocatedTokens: number) => void;
}) {
  const schema = z.object({
    allocated_tokens: z
      .string()
      .trim()
      .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, {
        message: "Enter a whole number ≥ 0.",
      })
      .refine((v) => Number(v) - member.allocated_tokens <= unallocatedTokens, {
        message: `Only ${unallocatedTokens.toLocaleString()} unallocated tokens available.`,
      }),
  });
  type AllocationRowValues = z.infer<typeof schema>;

  const form = useForm<AllocationRowValues>({
    resolver: zodResolver(schema),
    values: { allocated_tokens: String(member.allocated_tokens) },
  });

  function handleSubmit(values: AllocationRowValues) {
    onSave(member, Number(values.allocated_tokens));
  }

  const isOverLimit = member.allocated_tokens > 0 && member.usage_percent >= 100;
  const isNearLimit = member.allocated_tokens > 0 && member.usage_percent >= 80 && !isOverLimit;

  return (
    <li className="px-4 py-3 space-y-2.5 text-sm font-['Inter']">
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary font-['Manrope'] font-extrabold text-[11px]">
            {member.email.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <p className="flex-1 min-w-0 text-foreground font-semibold truncate flex items-center gap-1.5">
          {member.email}
          {isSelf && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              You
            </span>
          )}
          {isOverLimit && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
              Over limit
            </span>
          )}
        </p>
        {member.allocated_tokens > 0 && (
          <span
            className={`shrink-0 font-['Manrope'] text-xs font-bold ${
              isOverLimit
                ? "text-destructive"
                : isNearLimit
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            }`}
          >
            {Math.round(member.usage_percent)}%
          </span>
        )}
      </div>

      {member.allocated_tokens > 0 && (
        <Progress
          value={Math.min(100, member.usage_percent)}
          className="h-1.5"
          indicatorClassName={
            isOverLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"
          }
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground shrink-0">
          {member.used_tokens.toLocaleString()} / {member.allocated_tokens.toLocaleString()} tokens
        </p>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-start gap-1.5 shrink-0">
          <SharedFormField
            control={form.control}
            name="allocated_tokens"
            render={(field) => (
              <Input
                type="number"
                min={0}
                step={1}
                disabled={saving}
                className="w-24 h-7 text-xs"
                {...field}
              />
            )}
          />
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="h-7 px-2.5 text-xs font-['Manrope'] font-bold"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Save
          </Button>
        </form>
      </div>
      {serverError && <p className="text-xs text-destructive">{serverError}</p>}
    </li>
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

  // Admin: workspace subscription + per-member token usage overview (MS-248)
  const [subscription, setSubscription] = useState<SubscriptionUsage | null>(null);
  const [memberUsages, setMemberUsages] = useState<MemberTokenUsage[]>([]);
  const [unallocatedTokens, setUnallocatedTokens] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subLoaded, setSubLoaded] = useState(false);
  // Save-time (server) errors only — client-side validation lives in each
  // MemberAllocationRow's own zod schema via react-hook-form.
  const [allocationErrors, setAllocationErrors] = useState<Record<string, string>>({});
  const [allocationSavingId, setAllocationSavingId] = useState<string | null>(null);
  const [cancelActionLoading, setCancelActionLoading] = useState(false);
  const [cancelActionError, setCancelActionError] = useState<string | null>(null);

  // Admin: pending "request more tokens" asks from the team (MS-248
  // follow-up) — in-app only, so this is discovered by polling rather than
  // a real push notification (see the workspace-sidebar badge for the
  // app-wide version of this same poll).
  const [tokenRequests, setTokenRequests] = useState<TokenRequestRecord[]>([]);
  const [dismissingRequestId, setDismissingRequestId] = useState<string | null>(null);

  const refreshTokenRequests = () => {
    if (!isAdmin) return;
    PaymentApi.listTokenRequests<TokenRequestsResponse>()
      .then((res) => setTokenRequests(res.requests.filter((r) => r.status === "pending")))
      .catch(() => {});
  };

  function handleDismissRequest(requestId: string) {
    setDismissingRequestId(requestId);
    PaymentApi.dismissTokenRequest(requestId)
      .then(() => {
        setTokenRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      })
      .catch((err: unknown) => {
        toast({
          title: "Failed to dismiss request",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      })
      .finally(() => setDismissingRequestId(null));
  }

  useEffect(() => {
    if (!open || category !== "billing" || !isAdmin) return;
    setSubLoading(true);
    setSubError(null);
    refreshTokenRequests();
    PaymentApi.getMembersUsage<MembersUsageResponse>()
      .then((res) => {
        setSubscription(res.subscription);
        setMemberUsages(res.members);
        setUnallocatedTokens(res.unallocated_tokens);
      })
      .catch((err: unknown) => {
        setSubError(err instanceof Error ? err.message : "Failed to load subscription.");
      })
      .finally(() => {
        setSubLoading(false);
        setSubLoaded(true);
      });
  }, [open, category, isAdmin]);

  // Everyone: own token usage for the current subscription period (MS-248)
  const [myUsage, setMyUsage] = useState<MemberTokenUsage | null>(null);
  const [myUsageLoading, setMyUsageLoading] = useState(false);
  const [myUsageError, setMyUsageError] = useState<string | null>(null);
  const [myUsageLoaded, setMyUsageLoaded] = useState(false);

  useEffect(() => {
    if (!open || category !== "usage") return;
    setMyUsageLoading(true);
    setMyUsageError(null);
    PaymentApi.getMyUsage<MyMemberUsageResponse>()
      .then((res) => setMyUsage(res.usage))
      .catch((err: unknown) => {
        setMyUsageError(err instanceof Error ? err.message : "Failed to load usage.");
      })
      .finally(() => {
        setMyUsageLoading(false);
        setMyUsageLoaded(true);
      });
  }, [open, category]);

  const [requestingMoreTokens, setRequestingMoreTokens] = useState(false);
  const [tokenRequestSent, setTokenRequestSent] = useState(false);

  function handleRequestMoreTokens() {
    setRequestingMoreTokens(true);
    PaymentApi.requestMoreTokens()
      .then(() => {
        setTokenRequestSent(true);
        toast({
          title: "Request sent",
          description: "Your admin will see this request in the Billing tab.",
          variant: "success",
        });
      })
      .catch((err: unknown) => {
        toast({
          title: "Failed to send request",
          description: err instanceof Error ? err.message : "Please try again later.",
          variant: "destructive",
        });
      })
      .finally(() => setRequestingMoreTokens(false));
  }

  function handleSaveAllocation(member: MemberTokenUsage, allocatedTokens: number) {
    setAllocationErrors((prev) => {
      const next = { ...prev };
      delete next[member.user_id];
      return next;
    });
    setAllocationSavingId(member.user_id);
    PaymentApi.setMemberAllocation<UpdateMemberAllocationResponse>({
      user_id: member.user_id,
      allocated_tokens: allocatedTokens,
    })
      .then((res) => {
        setMemberUsages((prev) => prev.map((m) => (m.user_id === res.member.user_id ? res.member : m)));
        setUnallocatedTokens(res.unallocated_tokens);
      })
      .catch((err: unknown) => {
        setAllocationErrors((prev) => ({
          ...prev,
          [member.user_id]: err instanceof Error ? err.message : "Failed to update allocation.",
        }));
      })
      .finally(() => setAllocationSavingId(null));
  }

  function handleCancelSubscription() {
    setCancelActionLoading(true);
    setCancelActionError(null);
    PaymentApi.cancelSubscription<SubscriptionUsage>()
      .then(setSubscription)
      .catch((err: unknown) => {
        setCancelActionError(err instanceof Error ? err.message : "Failed to cancel subscription.");
      })
      .finally(() => setCancelActionLoading(false));
  }

  function handleResumeSubscription() {
    setCancelActionLoading(true);
    setCancelActionError(null);
    PaymentApi.resumeSubscription<SubscriptionUsage>()
      .then(setSubscription)
      .catch((err: unknown) => {
        setCancelActionError(err instanceof Error ? err.message : "Failed to resume subscription.");
      })
      .finally(() => setCancelActionLoading(false));
  }

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
    { key: "usage", label: "Usage", icon: Gauge },
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
        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-10">
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

          {category === "usage" && (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                  <Gauge className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Usage</h2>
                  <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">
                    Your token usage for the current billing cycle.
                  </p>
                </div>
              </div>

              {myUsageLoading ? (
                <p className="text-sm text-muted-foreground font-['Inter'] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading usage…
                </p>
              ) : myUsageError ? (
                <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {myUsageError}
                </p>
              ) : myUsage ? (
                <div className="rounded-xl border border-border/60 p-5 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-['Manrope'] text-2xl font-extrabold text-foreground">
                      {myUsage.used_tokens.toLocaleString()}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / {myUsage.allocated_tokens.toLocaleString()} tokens
                      </span>
                    </span>
                    <span className="font-['Manrope'] text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-full">
                      {myUsage.allocated_tokens > 0 ? `${Math.round(myUsage.usage_percent)}%` : "—"}
                    </span>
                  </div>
                  <Progress
                    value={myUsage.allocated_tokens > 0 ? Math.min(100, myUsage.usage_percent) : 0}
                  />
                  <p className="text-xs text-muted-foreground font-['Inter']">
                    {myUsage.allocated_tokens > 0
                      ? `${Math.max(0, myUsage.remaining_tokens).toLocaleString()} tokens remaining`
                      : isAdmin
                        ? "No token cap set for your own account yet — set one in the Billing tab if you want one."
                        : "No token allocation set for your account yet — ask your workspace admin."}
                  </p>
                  {myUsage.allocated_tokens > 0 && myUsage.remaining_tokens <= 0 && !isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={requestingMoreTokens || tokenRequestSent}
                      onClick={handleRequestMoreTokens}
                      className="w-full font-['Manrope'] font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      {requestingMoreTokens && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      {tokenRequestSent ? "Request sent to admin ✓" : "Request more tokens"}
                    </Button>
                  )}
                </div>
              ) : myUsageLoaded ? (
                <p className="text-sm text-muted-foreground font-['Inter']">
                  Your workspace doesn&apos;t have an active DocuLens subscription yet.
                </p>
              ) : null}
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
            <>
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

              {subLoading ? (
                <p className="text-sm text-muted-foreground font-['Inter'] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subscription…
                </p>
              ) : subError ? (
                <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {subError}
                </p>
              ) : subscription ? (
                <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-['Inter']">Current Plan</p>
                      <p className="font-['Manrope'] text-lg font-extrabold text-foreground">{subscription.plan_name}</p>
                    </div>
                    <span
                      className={`font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${
                        subscription.subscription_status === "active" && !subscription.cancel_at_period_end
                          ? "text-primary bg-primary/10"
                          : subscription.cancel_at_period_end
                            ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                            : "text-muted-foreground bg-muted"
                      }`}
                    >
                      {subscription.cancel_at_period_end ? "cancelling" : subscription.subscription_status}
                    </span>
                  </div>

                  {subscription.cancel_at_period_end && (
                    <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Subscription cancelled — access continues until{" "}
                      {dayjs(subscription.period_end).format("DD MMM YYYY")}, then it won&apos;t renew.
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs text-muted-foreground font-['Inter']">Token Usage</p>
                      <span className="font-['Manrope'] text-sm font-bold text-foreground">
                        {subscription.token_limit > 0
                          ? `${Math.round((subscription.token_used / subscription.token_limit) * 100)}%`
                          : "—"}
                      </span>
                    </div>
                    <p className="font-['Manrope'] text-xl font-extrabold text-foreground">
                      {subscription.token_used.toLocaleString()}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / {subscription.token_limit.toLocaleString()} Tokens
                      </span>
                    </p>
                    <Progress
                      value={
                        subscription.token_limit > 0
                          ? Math.min(100, (subscription.token_used / subscription.token_limit) * 100)
                          : 0
                      }
                    />
                    <p className="text-xs text-muted-foreground font-['Inter']">
                      {Math.max(0, subscription.token_remaining).toLocaleString()} tokens remaining
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                    <div>
                      <p className="text-xs text-muted-foreground font-['Inter']">Usage Period</p>
                      <p className="text-sm font-['Inter'] text-foreground mt-0.5">
                        {dayjs(subscription.period_start).format("DD MMM YYYY")} –{" "}
                        {dayjs(subscription.period_end).format("DD MMM YYYY")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-['Inter']">Token Reset</p>
                      <p className="text-sm font-['Inter'] text-foreground mt-0.5">
                        {subscription.next_reset_date
                          ? dayjs(subscription.next_reset_date).format("DD MMM YYYY, HH:mm:ss")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {cancelActionError && (
                    <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-destructive/10 text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {cancelActionError}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        router.push("/pricing");
                      }}
                      className="font-['Manrope'] font-bold"
                    >
                      View plans & pricing
                    </Button>
                    {subscription.is_paid && subscription.subscription_status === "active" && (
                      subscription.cancel_at_period_end ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={cancelActionLoading}
                          onClick={handleResumeSubscription}
                          className="font-['Manrope'] font-bold"
                        >
                          {cancelActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                          Resume subscription
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={cancelActionLoading}
                          onClick={handleCancelSubscription}
                          className="font-['Manrope'] font-bold text-destructive hover:text-destructive"
                        >
                          {cancelActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                          Cancel subscription
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ) : subLoaded ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
                  <div className="rounded-2xl bg-muted/40 border border-border/50 p-4">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-['Manrope'] font-bold text-foreground">No active subscription</p>
                    <p className="text-sm text-muted-foreground font-['Inter'] mt-1 max-w-sm">
                      Your workspace doesn&apos;t have an active DocuLens subscription yet.
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
              ) : null}
            </div>

            {tokenRequests.length > 0 && (
              <div className="max-w-xl space-y-2.5 pt-6">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-['Manrope'] text-sm font-extrabold text-foreground">
                    Token requests
                    <span className="ml-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full align-middle">
                      {tokenRequests.length} pending
                    </span>
                  </h3>
                </div>
                <ul className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card overflow-hidden">
                  {tokenRequests.map((r) => (
                    <li key={r.request_id} className="flex items-center gap-3 px-4 py-3 text-sm font-['Inter']">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-semibold truncate">{r.email}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.message || "Asked for a bigger token allocation"} ·{" "}
                          {dayjs(r.created_at).format("DD MMM, HH:mm")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={dismissingRequestId === r.request_id}
                        onClick={() => handleDismissRequest(r.request_id)}
                        className="h-7 px-2.5 text-xs font-['Manrope'] font-bold shrink-0"
                      >
                        {dismissingRequestId === r.request_id && (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        )}
                        Dismiss
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {subscription && memberUsages.length > 0 && (
              <div className="space-y-2.5 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-['Manrope'] text-sm font-extrabold text-foreground">Token allocations</h3>
                  <span className="shrink-0 font-['Manrope'] text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-full">
                    {unallocatedTokens.toLocaleString()} unallocated
                  </span>
                </div>
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
                  {memberUsages.map((m) => (
                    <MemberAllocationRow
                      key={m.user_id}
                      member={m}
                      isSelf={m.user_id === user?.user_id}
                      unallocatedTokens={unallocatedTokens}
                      saving={allocationSavingId === m.user_id}
                      serverError={allocationErrors[m.user_id]}
                      onSave={handleSaveAllocation}
                    />
                  ))}
                </ul>
              </div>
            )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
