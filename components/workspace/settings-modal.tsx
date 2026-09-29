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
  WorkspaceTokenSettings,
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
  MoreVertical,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillsSettings } from "@/components/workspace/skills/skills-settings";
import { EfficientModeSettings } from "@/components/workspace/efficient-mode/efficient-mode-settings";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/form-password-input";
import { FormField as SharedFormField } from "@/components/forms/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  editMemberSchema,
  EditMemberFormValues,
} from "@/lib/validations/auth";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsCategory = "general" | "account" | "usage" | "skills" | "efficient" | "team" | "billing";
const SETTINGS_CATEGORIES: SettingsCategory[] = ["general", "account", "usage", "skills", "efficient", "team", "billing"];

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

/** Reset-password confirmation modal for one team member. A lightweight
 * dialog, not the destructive-removal treatment — resetting a password
 * isn't dangerous the way removing a member is. Defined at module scope so
 * its form state isn't torn down and recreated on every SettingsModal
 * render. */
function ResetMemberPasswordDialog({
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
    <Dialog open onOpenChange={(open) => !open && !loading && onCancel()}>
      <DialogContent className="rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className="font-['Manrope'] font-extrabold">Reset password?</DialogTitle>
          <DialogDescription className="font-['Inter']">
            Set a new password for {member.name || member.email} to sign in with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" aria-busy={loading}>
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          <FormPasswordInput control={form.control} name="newPassword" label="New password" autoComplete="new-password" autoFocus />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={loading} onClick={onCancel} className="rounded-xl font-['Manrope'] font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl font-['Manrope'] font-bold">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {loading ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
 * reasoning as ResetMemberPasswordDialog above. */
function MemberAllocationRow({
  member,
  isSelf,
  highlight,
  unallocatedTokens,
  saving,
  serverError,
  onSave,
}: {
  member: MemberTokenUsage;
  isSelf?: boolean;
  /** Just-created member (MS-402): scroll to this row and focus its input
   * so the admin can confirm or adjust the cap right away. */
  highlight?: boolean;
  unallocatedTokens: number;
  saving: boolean;
  serverError?: string;
  onSave: (member: MemberTokenUsage, allocatedTokens: number) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
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

  useEffect(() => {
    if (!highlight) return;
    rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    form.setFocus("allocated_tokens", { shouldSelect: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  const isOverLimit = member.allocated_tokens > 0 && member.usage_percent >= 100;
  const isNearLimit = member.allocated_tokens > 0 && member.usage_percent >= 80 && !isOverLimit;

  return (
    <li
      ref={rowRef}
      className={`px-4 py-3 space-y-2.5 text-sm font-['Inter'] transition-colors ${
        highlight ? "bg-primary/5 ring-1 ring-inset ring-primary/40" : ""
      }`}
    >
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
          {member.is_default_allocation && (
            <span
              title="No custom cap set — the workspace's default token allocation applies."
              className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              Default
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

/** Workspace "Default Token Allocation" editor (MS-402) — what a new team
 * member is capped at when the Add user form leaves the cap blank, and what
 * members without a custom cap are held to. Module scope and its own
 * react-hook-form instance, same reasoning as MemberAllocationRow above. */
function DefaultAllocationCard({
  value,
  tokenLimit,
  saving,
  serverError,
  onSave,
}: {
  value: number;
  tokenLimit: number;
  saving: boolean;
  serverError?: string | null;
  onSave: (defaultAllocation: number) => void;
}) {
  const schema = z.object({
    default_member_allocation: z
      .string()
      .trim()
      .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, {
        message: "Enter a whole number ≥ 0.",
      })
      .refine((v) => Number(v) <= tokenLimit, {
        message: `Can't exceed the plan's ${tokenLimit.toLocaleString()} tokens.`,
      }),
  });
  type DefaultAllocationValues = z.infer<typeof schema>;

  const form = useForm<DefaultAllocationValues>({
    resolver: zodResolver(schema),
    values: { default_member_allocation: String(value) },
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-['Manrope'] text-sm font-extrabold text-foreground">Default token allocation</p>
          <p className="text-xs text-muted-foreground font-['Inter']">
            Applied to new members, and to anyone without a custom cap.
          </p>
        </div>
        <form
          onSubmit={form.handleSubmit((v) => onSave(Number(v.default_member_allocation)))}
          className="flex items-start gap-1.5 shrink-0"
        >
          <SharedFormField
            control={form.control}
            name="default_member_allocation"
            render={(field) => (
              <Input
                type="number"
                min={0}
                step={1}
                disabled={saving}
                aria-label="Default token allocation"
                className="w-28 h-7 text-xs"
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
    defaultValues: { newEmail: "", newPw: "", newAllocation: "" },
  });
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const editForm = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: { name: "" },
  });

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
  const [pool, setPool] = useState<{ tokenLimit: number; planName: string | null }>({
    tokenLimit: 0,
    planName: null,
  });
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

  const loadMembersUsage = () =>
    PaymentApi.getMembersUsage<MembersUsageResponse>().then((res) => {
      setSubscription(res.subscription);
      setMemberUsages(res.members);
      setUnallocatedTokens(res.unallocated_tokens);
      setPool({ tokenLimit: res.pool_token_limit, planName: res.pool_plan_name });
    });

  useEffect(() => {
    if (!open || category !== "billing" || !isAdmin) return;
    setSubLoading(true);
    setSubError(null);
    refreshTokenRequests();
    loadMembersUsage()
      .catch((err: unknown) => {
        setSubError(err instanceof Error ? err.message : "Failed to load subscription.");
      })
      .finally(() => {
        setSubLoading(false);
        setSubLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category, isAdmin]);

  // Admin: workspace Default Token Allocation (MS-402) — shown as the Add
  // user form's placeholder (Team) and edited in Billing.
  const [defaultAllocation, setDefaultAllocation] = useState<number | null>(null);
  const [defaultAllocationSaving, setDefaultAllocationSaving] = useState(false);
  const [defaultAllocationError, setDefaultAllocationError] = useState<string | null>(null);
  // Member just created from the Team tab — Billing scrolls to and focuses
  // their allocation row so the admin can confirm the cap right away.
  const [focusAllocationUserId, setFocusAllocationUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isAdmin || (category !== "team" && category !== "billing")) return;
    PaymentApi.getTokenSettings<WorkspaceTokenSettings>()
      .then((res) => setDefaultAllocation(res.default_member_allocation))
      .catch(() => {});
  }, [open, category, isAdmin]);

  useEffect(() => {
    if (category !== "billing") setFocusAllocationUserId(null);
  }, [category]);

  function handleSaveDefaultAllocation(value: number) {
    setDefaultAllocationError(null);
    setDefaultAllocationSaving(true);
    PaymentApi.updateTokenSettings<WorkspaceTokenSettings>({ default_member_allocation: value })
      .then((res) => {
        setDefaultAllocation(res.default_member_allocation);
        toast({ title: "Default allocation updated", variant: "success" });
        // Members on the default are now capped at the new value. Its own
        // catch: a failed refresh mustn't read as a failed save.
        loadMembersUsage().catch(() => {
          toast({
            title: "Couldn't refresh allocations",
            description: "The default was saved — reopen Billing to see updated caps.",
            variant: "warning",
          });
        });
      })
      .catch((err: unknown) => {
        setDefaultAllocationError(err instanceof Error ? err.message : "Failed to update default allocation.");
      })
      .finally(() => setDefaultAllocationSaving(false));
  }

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
    setFocusAllocationUserId(null);
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

  function openEdit(member: TeamMember) {
    editForm.reset({ name: member.name ?? "" });
    setEditTarget(member);
  }

  function handleEditSave(values: EditMemberFormValues) {
    if (!editTarget) return;
    const target = editTarget;
    if (values.name === (target.name ?? "")) {
      setEditTarget(null);
      return;
    }

    setEditLoading(true);
    AuthApi.updateAdminUser<TeamMember>(target.user_id, { name: values.name })
      .then((res) => {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === target.user_id ? { ...m, ...res } : m))
        );
        setEditTarget(null);
        toast({ title: "Member updated", variant: "success" });
      })
      .catch((err: unknown) => {
        toast({
          title: "Couldn't update member",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setEditLoading(false));
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

  function handleDeleteMember() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteLoading(true);
    AuthApi.deleteAdminUser(target.user_id)
      .then(() => {
        setMembers((prev) => prev.filter((m) => m.user_id !== target.user_id));
        setDeleteTarget(null);
        toast({
          title: "Member removed",
          description: `${target.email} no longer has access to this workspace.`,
          variant: "success",
        });
      })
      .catch((err: unknown) => {
        toast({
          title: "Couldn't remove member",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setDeleteLoading(false));
  }

  function handleCancelAdd() {
    addForm.reset();
    setAddMsg(null);
  }

  function handleAddMember(values: AddMemberFormValues) {
    setAddMsg(null);
    setAddLoading(true);
    AuthApi.addAdminUser<TeamMember>({
      email: values.newEmail,
      password: values.newPw,
      ...(values.newAllocation !== "" && { allocated_tokens: Number(values.newAllocation) }),
    })
      .then((created) => {
        setMembers((prev) => [created, ...prev]);
        addForm.reset();
        const granted = created.allocated_tokens;
        toast(
          created.allocation_clamped
            ? {
                title: `User ${values.newEmail} added`,
                description: `Token cap reduced to ${(granted ?? 0).toLocaleString()} — that's all that was left in the workspace pool.`,
                variant: "warning",
              }
            : {
                title: `User ${values.newEmail} added`,
                description:
                  granted != null
                    ? `Token cap set to ${granted.toLocaleString()} — adjust it below if needed.`
                    : "Set their token cap below.",
                variant: "success",
              }
        );
        // Land on this member's token settings (MS-402) instead of leaving
        // the admin to find them — the cap is the next thing to confirm.
        setFocusAllocationUserId(created.user_id);
        setCategory("billing");
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
    { key: "efficient", label: "Efficient Mode", icon: Zap },
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
        <div className="w-56 shrink-0 border-r border-border/60 bg-muted/30 flex flex-col py-8 px-4">
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
        <div className="min-w-0 flex-1 overflow-y-auto custom-scrollbar px-10 py-10">
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
            <SkillsSettings key={user?.user_id} active={open} />
          )}

          {category === "efficient" && (
            <EfficientModeSettings active={open} />
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
                  <FormInput
                    control={addForm.control}
                    name="newAllocation"
                    label="Token allocation"
                    type="number"
                    autoComplete="off"
                    disabled={atLimit}
                    placeholder={
                      defaultAllocation != null ? `Default: ${defaultAllocation.toLocaleString()}` : "Workspace default"
                    }
                    description="Leave blank to use the workspace default. You can change it anytime in Billing."
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
                <ResetMemberPasswordDialog
                  key={resetTarget.user_id}
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
                  {members.map((m) => {
                    const isCurrentUser = m.user_id === user?.user_id;
                    return (
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
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 truncate text-foreground font-semibold">{m.name || m.email}</p>
                          {isCurrentUser && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.name ? `${m.email} · ` : ""}Joined {dayjs(m.created_at).format("DD MMM YYYY")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="w-16 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/60 rounded-full py-1">
                          {m.role === "admin" ? "Admin" : "Member"}
                        </span>
                        {statusLoadingId === m.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                        ) : (
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {m.is_active ? "Active" : "Inactive"}
                            </span>
                            <Switch
                              checked={m.is_active}
                              onCheckedChange={(checked) => handleToggleStatus(m, checked)}
                              disabled={isCurrentUser}
                              aria-label={m.is_active ? "Deactivate member" : "Activate member"}
                            />
                          </div>
                        )}
                        {!isCurrentUser ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Actions for ${m.name || m.email}`}
                                className="h-8 w-8 rounded-full shrink-0 text-muted-foreground/60 hover:text-foreground"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={6}
                              className="w-44 p-1.5 rounded-xl bg-[#FAFBFF] dark:bg-popover border-[#CCD9F3] dark:border-border shadow-[0_8px_24px_rgba(45,63,100,0.10),0_2px_6px_rgba(45,63,100,0.05)] dark:shadow-md"
                            >
                              <DropdownMenuItem
                                onSelect={() => openEdit(m)}
                                className="gap-2 cursor-pointer rounded-md px-2 py-1.5 focus:bg-[#F1F5FF] dark:focus:bg-accent"
                              >
                                <Pencil className="size-4 shrink-0" />
                                Edit member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setResetTarget(m)}
                                className="gap-2 cursor-pointer rounded-md px-2 py-1.5 focus:bg-[#F1F5FF] dark:focus:bg-accent"
                              >
                                <KeyRound className="size-4 shrink-0" />
                                Reset password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#DCE4F5] dark:bg-border" />
                              <DropdownMenuItem
                                onSelect={() => setDeleteTarget(m)}
                                className="gap-2 cursor-pointer rounded-md px-2 py-1.5 font-bold text-[#F0444E] focus:text-[#F0444E] focus:bg-[#FFF1F2] dark:focus:bg-destructive/20"
                              >
                                <Trash2 className="size-4 shrink-0 text-[#F0444E]" />
                                Remove member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="h-8 w-8 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground font-['Inter']">No team members yet.</p>
              )}

              <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="rounded-2xl bg-[#FAFBFF] dark:bg-background shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-['Manrope'] font-extrabold">Remove team member?</AlertDialogTitle>
                    <AlertDialogDescription className="font-['Inter'] space-y-2">
                      <span className="block">
                        {deleteTarget?.name || deleteTarget?.email} will lose access immediately. Their
                        active sessions will be signed out.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading} className="rounded-xl font-['Manrope'] font-semibold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteMember();
                      }}
                      className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
                    >
                      {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Remove member
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog open={!!editTarget} onOpenChange={(open) => !open && !editLoading && setEditTarget(null)}>
                <DialogContent className="rounded-2xl bg-[#FAFBFF] dark:bg-background shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]" showCloseButton={!editLoading}>
                  <DialogHeader>
                    <DialogTitle className="font-['Manrope'] font-extrabold">Edit member</DialogTitle>
                    <DialogDescription className="font-['Inter']">
                      {editTarget?.email}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4" aria-busy={editLoading}>
                      <FormInput control={editForm.control} name="name" label="Name" autoComplete="off" disabled={editLoading} />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={editLoading}
                          onClick={() => setEditTarget(null)}
                          className="rounded-xl font-['Manrope'] font-semibold"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={editLoading} className="rounded-xl font-['Manrope'] font-bold">
                          {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Save changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
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

                  {subscription.subscription_status === "expired" && pool.planName && (
                    <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Plan expired — the workspace is on the {pool.planName} quota (
                      {pool.tokenLimit.toLocaleString()} tokens) until you renew. Member caps still apply.
                    </p>
                  )}

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
                        // Deferred a tick so the Settings Dialog's own unmount
                        // (portal + focus-restore) commits before the route
                        // change starts — doing both in one commit could
                        // intermittently produce a hydration mismatch on
                        // /pricing that made the navigation get abandoned,
                        // leaving the URL on /home (same class of issue as
                        // the Settings-open timing fix above, MS-255).
                        setTimeout(() => router.push("/pricing"), 0);
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
                      // See the other "View plans & pricing" button above:
                      // deferring avoids an intermittent hydration mismatch
                      // that could abandon the /pricing navigation.
                      setTimeout(() => router.push("/pricing"), 0);
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

            {subscription && (memberUsages.length > 0 || defaultAllocation != null) && (
              <div className="space-y-2.5 pt-6">
                {defaultAllocation != null && (
                  <DefaultAllocationCard
                    value={defaultAllocation}
                    tokenLimit={pool.tokenLimit}
                    saving={defaultAllocationSaving}
                    serverError={defaultAllocationError}
                    onSave={handleSaveDefaultAllocation}
                  />
                )}
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
                      highlight={m.user_id === focusAllocationUserId}
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
