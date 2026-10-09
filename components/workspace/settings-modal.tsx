"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { AuthApi } from "@/services/resources/auth-api";
import { paymentsApi } from "@/services/payments/handler/payments.api";
import { useMyUsage } from "@/features/billing/hooks/use-my-usage";
import { useToast } from "@/hooks/use-toast";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import type { AuthUser, TeamMember, TeamMembersResponse } from "@/services/types";
import type {
  SubscriptionUsage,
  MemberTokenUsage,
  UpdateMemberAllocationRequest,
} from "@/services/payments/type/subscription.type";
import type { TokenRequestRecord } from "@/services/payments/type/token-request.type";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Gauge,
  HardDrive,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button, ButtonSpinner } from "@/components/ui/button";
import { SkillsSettings } from "@/components/workspace/skills/skills-settings";
import { EfficientModeSettings } from "@/components/workspace/efficient-mode/efficient-mode-settings";
import { StorageSettings } from "@/components/workspace/storage-settings";
import { OPEN_SETTINGS_EVENT } from "@/lib/open-settings";
import {
} from "@/lib/menu-styles";
import { DeleteGlyph, DotsGlyph, MENU_LUCIDE, MenuIcon, RenameGlyph } from "@/components/ui/menu-icons";
import {
  CAPTION_CLASS,
  CARD_CLASS,
  FIGURE_CLASS,
  FIGURE_UNIT_CLASS,
  LABEL_CLASS,
  LIST_CLASS,
  ROW_CLASS,
  SETTINGS_DIALOG_CLASS,
  SettingRow,
  SettingsGroup,
  SettingsHeader,
  SettingsSection,
} from "@/components/workspace/settings-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TokenQuotaUsage, quotaTone } from "@/components/token-quota-usage";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getInitials } from "@/lib/utils";
import { FormFieldset } from "@/components/forms/form-fieldset";
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
import { IconButton } from "@/components/icon-button";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/icon-tile";
import { Panel } from "@/components/panel";
import { Notice } from "@/components/notice";
import { panelVariants } from "@/components/panel";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsCategory = "general" | "account" | "usage" | "storage" | "skills" | "efficient" | "team" | "billing";
const SETTINGS_CATEGORIES: SettingsCategory[] = ["general", "account", "usage", "storage", "skills", "efficient", "team", "billing"];

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
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Reset password?</DialogTitle>
          <DialogDescription>
            Set a new password for {member.name || member.email} to sign in with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormFieldset busy={loading} className="block space-y-4">
            {error && (
              <Notice role="alert" tone="error">{error}</Notice>
            )}
            <FormPasswordInput control={form.control} name="newPassword" label="New password" autoComplete="new-password" autoFocus />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} loadingText="Resetting…">
                Reset password
              </Button>
            </DialogFooter>
          </FormFieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The always-visible usage line of a member row: one bar for the period that
 * matters (monthly once rolling quotas are on, else the plan period), plus a
 * flag when any of their limits is close to, or at, its cap. */
function AllocationSummary({ member }: { member: MemberTokenUsage }) {
  const tiers = member.quota_anchor_at ? (member.quota_tiers ?? []) : [];
  const monthly = tiers.find((tier) => tier.interval === "monthly");
  const used = monthly ? monthly.token_used : member.used_tokens;
  const limit = monthly ? monthly.token_limit : member.allocated_tokens;
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const planBlocked = limit > 0 && percent >= 100;
  const tierPercent = (tier: (typeof tiers)[number]) =>
    tier.token_limit > 0 ? Math.min(100, (tier.token_used / tier.token_limit) * 100) : 100;
  const anyBlocked = monthly || tiers.length ? tiers.some((tier) => tier.blocked) : planBlocked;
  const anyNear = !anyBlocked && (tiers.some((tier) => tierPercent(tier) >= 80) || (!tiers.length && percent >= 80));
  const tone = quotaTone(percent, anyBlocked && !tiers.length ? true : Boolean(monthly?.blocked));
  const text = `${used.toLocaleString()} / ${limit.toLocaleString()}`;

  return (
    <div className="min-w-0 space-y-1.5">
      <p title={`${text} tokens`} className="truncate font-manrope text-xs font-bold tabular-nums text-foreground">
        {used.toLocaleString()} <span className="font-normal text-muted-foreground">/ {limit.toLocaleString()}</span>
      </p>
      <Progress
        value={percent}
        aria-label={`Token usage for ${member.email}`}
        aria-valuenow={percent}
        aria-valuetext={`${text} tokens used`}
        className="h-1.5"
        indicatorClassName={anyBlocked ? "bg-destructive" : anyNear ? "bg-warning" : tone.bar}
      />
      <p
        className={cn(
          "text-[11px] tabular-nums",
          anyBlocked
            ? "font-semibold text-danger-ink"
            : anyNear
              ? "font-semibold text-warning-ink"
              : "text-muted-foreground",
        )}
      >
        {anyBlocked ? "Limit reached" : anyNear ? "Near limit" : limit > 0 ? `${Math.round(percent)}% used` : "No cap"}
      </p>
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
 * reasoning as ResetMemberPasswordDialog above. */
function MemberAllocationRow({
  member,
  isSelf,
  highlight,
  unallocatedTokens,
  saving,
  serverError,
  onSave,
  onClearError,
}: {
  member: MemberTokenUsage;
  isSelf?: boolean;
  /** Just-created member (MS-402): scroll to this row and focus its input
   * so the admin can confirm or adjust the cap right away. */
  highlight?: boolean;
  unallocatedTokens: number;
  saving: boolean;
  serverError?: string;
  onSave: (member: MemberTokenUsage, body: UpdateMemberAllocationRequest, onSuccess?: () => void) => void;
  onClearError: (userId: string) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const [quotaEditorOpen, setQuotaEditorOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
    onSave(member, { user_id: member.user_id, allocated_tokens: Number(values.allocated_tokens) });
  }

  const quotaSchema = z.object({
    allocated_tokens: z.string().trim()
      .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, "Enter a whole number ≥ 0.")
      .refine((v) => Number(v) - member.allocated_tokens <= unallocatedTokens,
        `Only ${unallocatedTokens.toLocaleString()} unallocated tokens available.`),
    daily_token_quota: z.string().trim()
      .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, "Enter a whole number ≥ 0."),
    weekly_token_quota: z.string().trim()
      .refine((v) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0, "Enter a whole number ≥ 0."),
  }).superRefine((values, ctx) => {
    const [daily, weekly, monthly] = [values.daily_token_quota, values.weekly_token_quota, values.allocated_tokens].map(Number);
    if (daily > weekly) {
      ctx.addIssue({ code: "custom", path: ["daily_token_quota"], message: "Daily can't exceed the weekly limit." });
    }
    if (weekly > monthly) {
      ctx.addIssue({ code: "custom", path: ["weekly_token_quota"], message: "Weekly can't exceed the monthly limit." });
    }
  });
  type QuotaValues = z.infer<typeof quotaSchema>;
  // Prefill the 200,000 monthly cap when the pool can give it, with weekly
  // and daily at 25% and 1% of it (2,000 / 50,000 / 200,000). Rounded up like
  // the backend's defaults, so the untouched form satisfies daily <= weekly <= monthly.
  const monthlyDefault = member.quota_anchor_at || 200_000 - member.allocated_tokens > unallocatedTokens
    ? member.allocated_tokens
    : 200_000;
  const quotaValues: QuotaValues = {
    allocated_tokens: String(monthlyDefault),
    daily_token_quota: String(member.quota_tiers?.find((tier) => tier.interval === "daily")?.token_limit ?? Math.ceil(monthlyDefault / 100)),
    weekly_token_quota: String(member.quota_tiers?.find((tier) => tier.interval === "weekly")?.token_limit ?? Math.ceil(monthlyDefault / 4)),
  };
  const quotaForm = useForm<QuotaValues>({
    resolver: zodResolver(quotaSchema),
    values: quotaValues,
  });

  function closeQuotaEditor() {
    quotaForm.reset(quotaValues);
    onClearError(member.user_id);
    setQuotaEditorOpen(false);
  }

  function handleQuotaSubmit(values: QuotaValues) {
    onSave(member, {
      user_id: member.user_id,
      allocated_tokens: Number(values.allocated_tokens),
      daily_token_quota: Number(values.daily_token_quota),
      weekly_token_quota: Number(values.weekly_token_quota),
    }, () => setQuotaEditorOpen(false));
  }

  useEffect(() => {
    if (!highlight) return;
    setExpanded(true);
    // The collapsed content is unmounted; wait for it before focusing.
    const frame = requestAnimationFrame(() => {
      rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      form.setFocus("allocated_tokens", { shouldSelect: true });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  const isOverLimit = member.allocated_tokens > 0 && member.usage_percent >= 100;
  const isNearLimit = member.allocated_tokens > 0 && member.usage_percent >= 80 && !isOverLimit;
  const quotaFields = [
    { interval: "daily", label: "Daily", name: "daily_token_quota" },
    { interval: "weekly", label: "Weekly", name: "weekly_token_quota" },
    { interval: "monthly", label: "Monthly", name: "allocated_tokens" },
  ] as const;

  // Keep the saved usage beside each input, so changing a limit never
  // makes the member's current consumption disappear from the editor.
  const quotaCards = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {quotaFields.map(({ interval, label, name }) => {
        const tier = member.quota_tiers?.find((item) => item.interval === interval);
        const percent = tier && tier.token_limit > 0
          ? Math.min(100, (tier.token_used / tier.token_limit) * 100)
          : tier ? 100 : 0;
        const tone = quotaTone(percent, Boolean(tier?.blocked));
        return (
          <section key={interval} aria-label={`${label} quota for ${member.email}`} className={cn(panelVariants({ padding: "sm" }), "min-w-0 space-y-2.5", tone.card)}>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h4 className="font-manrope text-xs font-bold text-foreground">{label}</h4>
              {tier?.blocked && (
                <Badge variant={tone.badge}>Limit reached</Badge>
              )}
            </div>
            {tier ? (
              <>
                <p className="font-manrope text-base font-bold tabular-nums tracking-tight text-foreground">
                  {tier.token_used.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">/ {tier.token_limit.toLocaleString()}</span>
                </p>
                <Progress
                  value={percent}
                  aria-label={`${label} token usage for ${member.email}`}
                  aria-valuenow={percent}
                  aria-valuetext={`${tier.token_used.toLocaleString()} of ${tier.token_limit.toLocaleString()} tokens used`}
                  className="h-1.5"
                  indicatorClassName={tone.bar}
                />
                <p className={`text-[11px] ${tier.blocked ? tone.text : "text-muted-foreground"}`}>{tier.token_remaining.toLocaleString()} tokens remaining</p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">Usage starts at 0 when saved.</p>
            )}
            {quotaEditorOpen && (
              <SharedFormField control={quotaForm.control} name={name} label={tier ? "New limit" : "Token limit"} render={(field) => (
                <Input aria-label={`${label} token limit`} type="number" min={0} step={1} disabled={saving} size="sm" className="tabular-nums" {...field} />
              )} />
            )}
            {tier && (
              <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                <p className="mb-0.5">Next reset</p>
                <time dateTime={tier.next_reset_date} className="block text-foreground">
                  <span className="block">{dayjs(tier.next_reset_date).format("DD MMM YYYY")}</span>
                  <span className="block text-muted-foreground">{dayjs(tier.next_reset_date).format("HH:mm:ss [UTC]Z")}</span>
                </time>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );

  const open = expanded || quotaEditorOpen;

  return (
    <li
      ref={rowRef}
      className="px-5 py-4 font-inter text-xs"
    >
      <Collapsible open={open} onOpenChange={setExpanded}>
        <div className="flex items-center gap-3">
          <CollapsibleTrigger
            disabled={quotaEditorOpen}
            aria-label={`${open ? "Hide" : "Show"} token details for ${member.email}`}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default"
          >
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground font-manrope text-[11px] font-bold">
                {member.email.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 sm:flex-[1.2]">
              <div className="flex items-center gap-1.5">
                <p title={member.email} className="min-w-0 truncate text-[13px] font-semibold text-foreground">{member.email}</p>
                {isSelf && (
                  <Badge variant="secondary">You</Badge>
                )}
                {member.is_default_allocation && (
                  <Badge variant="secondary" title="The workspace's default token allocation applies.">Default</Badge>
                )}
              </div>
              <div className="mt-2 sm:hidden">
                <AllocationSummary member={member} />
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <AllocationSummary member={member} />
            </div>
            <ChevronDown
              aria-hidden
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 group-disabled:opacity-40"
            />
          </CollapsibleTrigger>
          {!quotaEditorOpen && (
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setExpanded(true);
                setQuotaEditorOpen(true);
              }}
              className="w-[104px] shrink-0 justify-center"
            >
              <Pencil className="h-3 w-3" />
              {member.quota_anchor_at ? "Edit" : "Set quotas"}
            </Button>
          )}
        </div>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="space-y-3 pt-4 sm:pl-12">
            {!member.quota_anchor_at && !quotaEditorOpen && (
              <div className="space-y-2.5">
                {member.allocated_tokens > 0 && (
                  <Progress value={Math.min(100, member.usage_percent)} className="h-1.5" indicatorClassName={isOverLimit ? "bg-destructive" : isNearLimit ? "bg-warning" : "bg-primary"} />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {member.used_tokens.toLocaleString()} / {member.allocated_tokens.toLocaleString()} tokens this plan period
                  </p>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="shrink-0">
                    <FormFieldset busy={saving} className="flex items-start gap-1.5">
                      <SharedFormField control={form.control} name="allocated_tokens" render={(field) => (
                        <Input aria-label={`Token allocation for ${member.email}`} type="number" min={0} step={1} disabled={saving} size="sm" className="w-24" {...field} />
                      )} />
                      <Button size="sm" type="submit" loading={saving} loadingText="Saving…">
                        Save
                      </Button>
                    </FormFieldset>
                  </form>
                </div>
              </div>
            )}

            {quotaEditorOpen ? (
              <form onSubmit={quotaForm.handleSubmit(handleQuotaSubmit)}>
                <FormFieldset busy={saving} className="block space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Monthly allocation comes from the workspace pool. Daily and weekly limits control how quickly it can be used.
                  </p>
                  {quotaCards}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      {member.quota_anchor_at ? "Changing a limit does not reset usage." : "All reset schedules start when you save."}
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                      <Button type="button" variant="outline" size="sm" disabled={saving} onClick={closeQuotaEditor}>Cancel</Button>
                      <Button type="submit" size="sm" loading={saving} loadingText="Saving…">
                        Save changes
                      </Button>
                    </div>
                  </div>
                </FormFieldset>
              </form>
            ) : member.quota_anchor_at ? quotaCards : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
      {serverError && <Notice role="alert" tone="error" className="mt-3">{serverError}</Notice>}
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
    <SettingsGroup>
      <SettingRow
        title="Default token allocation"
        description="Monthly cap for new members. Their daily and weekly limits are set automatically at 1% and 25% of it."
      >
        <form
          onSubmit={form.handleSubmit((v) => onSave(Number(v.default_member_allocation)))}>
          <FormFieldset busy={saving} className="flex items-start gap-2">
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
                  size="sm" className="w-28"
                  {...field}
                />
              )}
            />
            <Button
              size="sm"
              type="submit"
              loading={saving}
              loadingText="Saving…"
            >
              Save
            </Button>
          </FormFieldset>
        </form>
      </SettingRow>
      {serverError && (
        <div className="px-5 py-3">
          <Notice tone="error">{serverError}</Notice>
        </div>
      )}
    </SettingsGroup>
  );
}

/** Claude-desktop-style settings: fixed left menu, scrollable content pane on
 * the right. Lives once at the workspace layout level (MS-91 follow-up) so
 * both the sidebar footer menu and the header account menu can open the
 * same modal instead of navigating to a /settings page. */
export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const autoHideScrollbar = useAutoHideScrollbar<HTMLDivElement>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [category, setCategory] = useState<SettingsCategory>("general");
  // Below md the rail and the tab no longer fit side by side, so they take
  // turns: "list" shows the categories, "detail" shows the chosen one.
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [navQuery, setNavQuery] = useState("");
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
    paymentsApi.listTokenRequests()
      .then((res) => setTokenRequests(res.requests.filter((r) => r.status === "pending")))
      .catch(() => {});
  };

  function handleDismissRequest(requestId: string) {
    setDismissingRequestId(requestId);
    paymentsApi.dismissTokenRequest(requestId)
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
    paymentsApi.getMembersUsage().then((res) => {
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
    paymentsApi.getTokenSettings()
      .then((res) => setDefaultAllocation(res.default_member_allocation))
      .catch(() => {});
  }, [open, category, isAdmin]);

  useEffect(() => {
    if (category !== "billing") setFocusAllocationUserId(null);
  }, [category]);

  function handleSaveDefaultAllocation(value: number) {
    setDefaultAllocationError(null);
    setDefaultAllocationSaving(true);
    paymentsApi.updateTokenSettings({ default_member_allocation: value })
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
  const {
    usage: myUsage,
    isLoading: myUsageLoading,
    isLoaded: myUsageLoaded,
    error: myUsageQueryError,
  } = useMyUsage({ enabled: open && category === "usage" });
  const myUsageError = myUsageQueryError ? myUsageQueryError.message || "Failed to load usage." : null;

  const [requestingMoreTokens, setRequestingMoreTokens] = useState(false);
  const [tokenRequestSent, setTokenRequestSent] = useState(false);

  function handleRequestMoreTokens() {
    setRequestingMoreTokens(true);
    paymentsApi.requestMoreTokens()
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

  function handleSaveAllocation(member: MemberTokenUsage, body: UpdateMemberAllocationRequest, onSuccess?: () => void) {
    setAllocationErrors((prev) => {
      const next = { ...prev };
      delete next[member.user_id];
      return next;
    });
    setAllocationSavingId(member.user_id);
    paymentsApi.setMemberAllocation(body)
      .then((res) => {
        setMemberUsages((prev) => prev.map((m) => (m.user_id === res.member.user_id ? res.member : m)));
        setUnallocatedTokens(res.unallocated_tokens);
        onSuccess?.();
      })
      .catch((err: unknown) => {
        setAllocationErrors((prev) => ({
          ...prev,
          [member.user_id]: err instanceof Error ? err.message : "Failed to update allocation.",
        }));
      })
      .finally(() => setAllocationSavingId(null));
  }

  function clearAllocationError(userId: string) {
    setAllocationErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function handleCancelSubscription() {
    setCancelActionLoading(true);
    setCancelActionError(null);
    paymentsApi.cancelSubscription()
      .then(setSubscription)
      .catch((err: unknown) => {
        setCancelActionError(err instanceof Error ? err.message : "Failed to cancel subscription.");
      })
      .finally(() => setCancelActionLoading(false));
  }

  function handleResumeSubscription() {
    setCancelActionLoading(true);
    setCancelActionError(null);
    paymentsApi.resumeSubscription()
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
    setMobileView("detail");
    onOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let other parts of the workspace open Settings on a given tab (e.g. the
  // Files-tab storage meter). Flagged like a hash restore so the
  // "land on General" effect below leaves the chosen tab alone.
  useEffect(() => {
    const onOpenRequest = (event: Event) => {
      const requested = (event as CustomEvent<{ category?: string }>).detail?.category as SettingsCategory | undefined;
      if (!requested || !SETTINGS_CATEGORIES.includes(requested)) return;
      if ((requested === "team" || requested === "billing") && !isAdmin) return;
      // Only when opening: an already-open dialog never runs the reset below,
      // so the flag would linger and skip the next manual open's reset.
      if (!open) didRestoreFromHash.current = true;
      setCategory(requested);
      setMobileView("detail");
      onOpenChange(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpenRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, open]);

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
    setMobileView("list");
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
                    ? `Monthly cap set to ${granted.toLocaleString()}, with daily and weekly limits set automatically. Adjust them below if needed.`
                    : "Set their token cap below.",
                variant: "success",
              }
        );
        // Land on this member's token settings (MS-402) instead of leaving
        // the admin to find them — the cap is the next thing to confirm.
        setFocusAllocationUserId(created.user_id);
        setCategory("billing");
        setMobileView("detail");
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

  // Grouped like the workspace sidebar (small labels, one list) instead of a flat stack.
  const menuGroups: { label: string; items: { key: SettingsCategory; label: string; icon: typeof Lock }[] }[] = [
    {
      label: "You",
      items: [
        { key: "general", label: "General", icon: User },
        { key: "account", label: "Account", icon: Lock },
      ],
    },
    {
      label: "Workspace",
      items: [
        { key: "usage", label: "Usage", icon: Gauge },
        { key: "storage", label: "Storage", icon: HardDrive },
      ],
    },
    {
      label: "Tools",
      items: [
        { key: "skills", label: "Skills", icon: Sparkles },
        { key: "efficient", label: "Efficient Mode", icon: Zap },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Admin",
            items: [
              { key: "team" as const, label: "Team Members", icon: Users },
              { key: "billing" as const, label: "Billing", icon: CreditCard },
            ],
          },
        ]
      : []),
  ];

  const navSearch = navQuery.trim().toLowerCase();
  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !navSearch || item.label.toLowerCase().includes(navSearch)),
    }))
    .filter((group) => group.items.length > 0);

  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={autoHideScrollbar}
        showCloseButton
        className={SETTINGS_DIALOG_CLASS}
        // Opening shouldn't drop the cursor into the menu's search box.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* Fixed left menu: neutral rail, one step off the card-tone pane, divided by a light line. */}
        <div className={`flex w-full shrink-0 flex-col overflow-y-auto bg-[#f7f8fa] px-4 pb-6 pt-8 md:w-[236px] md:border-r md:border-border dark:bg-sidebar ${mobileView === "detail" ? "max-md:hidden" : ""}`}>
          <p className="mb-4 px-[11px] font-manrope text-xl font-extrabold tracking-tight text-foreground">Settings</p>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search settings"
              placeholder="Search"
              value={navQuery}
              onChange={(event) => setNavQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <nav className="flex flex-col">
            {visibleGroups.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <p className="px-[11px] pb-1.5 pt-5 font-manrope text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = category === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setCategory(item.key);
                        setMobileView("detail");
                      }}
                      className={`flex h-10 items-center gap-[11px] rounded-lg px-[11px] text-left font-manrope text-[13px] font-bold transition-colors ${
                        isActive
                          ? "bg-primary/5 text-primary-pressed dark:bg-primary/15 dark:text-primary"
                          : "text-foreground/85 hover:bg-primary/[0.03] hover:text-foreground"
                      }`}
                    >
                      <Icon className={cn("size-[17px] shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Content pane */}
        <div className={`min-w-0 flex-1 overflow-y-auto custom-scrollbar px-4 py-5 md:px-10 md:py-9 ${mobileView === "list" ? "max-md:hidden" : ""}`}>
          {/* Phones only: back to the category list. Right padding clears the
              dialog's close button, which floats over this corner. */}
          <div className="-mt-1 mb-4 pr-12 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className="-ml-2 flex h-10 items-center gap-1 rounded-lg pl-1 pr-3 font-manrope text-[13px] font-bold text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
              Settings
            </button>
          </div>
          {category === "general" && (
            <div className="max-w-2xl space-y-8">
              <SettingsHeader icon={User} title="General" description="Your name and photo, shown across the workspace." />

              <SettingsSection title="Profile">
                <SettingsGroup>
                  <SettingRow
                    inline
                    title="Profile photo"
                    description={
                      avatarError ? (
                        <span className="text-danger-ink">{avatarError}</span>
                      ) : (
                        "JPG or PNG, square photos work best."
                      )
                    }
                  >
                    <div className="relative shrink-0">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                      <button
                        type="button"
                        disabled={avatarUploading || avatarRemoving}
                        onClick={() => avatarInputRef.current?.click()}
                        aria-label="Change photo"
                        title="Change photo"
                        className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                      >
                        <Avatar className="size-14">
                          <AvatarImage src={user?.avatar_url} alt={displayName} />
                          <AvatarFallback className="bg-muted font-manrope text-base font-bold text-muted-foreground">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute inset-0 grid place-items-center rounded-full bg-[#182033]/80 text-white transition-opacity ${
                            avatarUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                          }`}
                        >
                          {avatarUploading ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                        </span>
                      </button>
                      {user?.avatar_url && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={avatarRemoving}
                          aria-label={avatarRemoving ? "Removing photo…" : "Remove photo"}
                          title={avatarRemoving ? "Removing photo…" : "Remove photo"}
                          className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:opacity-50 max-sm:after:absolute max-sm:after:-inset-2.5 max-sm:after:content-['']"
                        >
                          {avatarRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </SettingRow>

                  <form onSubmit={nameForm.handleSubmit(handleSaveName)}>
                    <FormFieldset busy={nameSaving} className="block divide-y divide-border">
                      {nameMsg && (
                        <div className="px-5 py-3">
                          <Notice role="status" aria-live="polite" tone={nameMsg.type === "ok" ? "success" : "error"}>{nameMsg.text}</Notice>
                        </div>
                      )}
                      <SettingRow title="Display name" description="How your name appears to teammates.">
                        <FormInput
                          control={nameForm.control}
                          name="name"
                          aria-label="Display name"
                          autoComplete="name"
                          className="w-64 max-sm:w-full"
                        />
                      </SettingRow>
                      <div className="flex justify-end px-5 py-3">
                        <Button type="submit" loading={nameSaving} loadingText="Saving…">
                          Save changes
                        </Button>
                      </div>
                    </FormFieldset>
                  </form>
                </SettingsGroup>
              </SettingsSection>
            </div>
          )}

          {category === "skills" && (
            <SkillsSettings key={user?.user_id} active={open} />
          )}

          {category === "efficient" && (
            <EfficientModeSettings active={open} />
          )}

          {category === "account" && (
            <div className="max-w-2xl space-y-8">
              <SettingsHeader icon={Lock} title="Account" description="Who you're signed in as, and your password." />

              <SettingsSection title="Signed in">
                <SettingsGroup>
                  <SettingRow inline title="Email" description={user?.email}>
                    <Badge variant={isAdmin ? "info" : "secondary"}>{isAdmin ? "Admin" : "Member"}</Badge>
                  </SettingRow>
                </SettingsGroup>
              </SettingsSection>

              <SettingsSection title="Change password" description="Update your current password.">
                <Form {...pwForm}>
                  <form onSubmit={pwForm.handleSubmit(handleChangePw)}>
                    <FormFieldset busy={pwLoading} className="block">
                      <SettingsGroup>
                        {pwMsg && (
                          <div className="px-5 py-3">
                            <Notice role="status" aria-live="polite" tone={pwMsg.type === "ok" ? "success" : "error"}>{pwMsg.text}</Notice>
                          </div>
                        )}
                        <SettingRow title="Current password">
                          <FormPasswordInput
                            control={pwForm.control}
                            name="current"
                            aria-label="Current password"
                            autoComplete="current-password"
                            className="w-64 max-sm:w-full"
                          />
                        </SettingRow>
                        <SettingRow title="New password">
                          <FormPasswordInput
                            control={pwForm.control}
                            name="next"
                            aria-label="New password"
                            autoComplete="new-password"
                            className="w-64 max-sm:w-full"
                          />
                        </SettingRow>
                        <SettingRow title="Confirm new password">
                          <FormPasswordInput
                            control={pwForm.control}
                            name="confirm"
                            aria-label="Confirm new password"
                            autoComplete="new-password"
                            className="w-64 max-sm:w-full"
                          />
                        </SettingRow>
                        <div className="flex justify-end px-5 py-3">
                          <Button type="submit" loading={pwLoading} loadingText="Updating…">
                            Update password
                          </Button>
                        </div>
                      </SettingsGroup>
                    </FormFieldset>
                  </form>
                </Form>
              </SettingsSection>
            </div>
          )}

          {category === "storage" && (
            <StorageSettings
              isAdmin={isAdmin}
              onViewPlans={() => {
                onOpenChange(false);
                // Deferred a tick for the same reason as "View plans & pricing" in Billing.
                setTimeout(() => router.push("/pricing"), 0);
              }}
            />
          )}

          {category === "usage" && (
            <div className="max-w-2xl space-y-8">
              <SettingsHeader
                icon={Gauge}
                title="Usage"
                badge={<Badge variant={isAdmin ? "info" : "secondary"}>{isAdmin ? "Admin" : "Member"}</Badge>}
                description="Your token limits, current usage, and reset times."
              />

              {myUsageLoading ? (
                <div role="status">
                  <span className="sr-only">Loading usage…</span>
                  <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className={cn(CARD_CLASS, "space-y-3 p-4")}>
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-1.5 w-full rounded-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : myUsageError ? (
                <Notice tone="error">{myUsageError}</Notice>
              ) : myUsage ? (
                <SettingsSection
                  title="Token limits"
                  description={myUsage.quota_tiers?.length ? "How much you have used in each period." : undefined}
                >
                  {myUsage.quota_tiers?.length ? (
                    <TokenQuotaUsage tiers={myUsage.quota_tiers} layout="cards" />
                  ) : (
                    <SettingsGroup>
                      <div className="space-y-3 px-5 py-5">
                        <div className="flex items-baseline justify-between">
                          <span className={FIGURE_CLASS}>
                            {myUsage.used_tokens.toLocaleString()}{" "}
                            <span className={FIGURE_UNIT_CLASS}>
                              / {myUsage.allocated_tokens.toLocaleString()} tokens
                            </span>
                          </span>
                          <Badge variant="secondary">
                            {myUsage.allocated_tokens > 0 ? `${Math.round(myUsage.usage_percent)}%` : "—"}
                          </Badge>
                        </div>
                        <Progress
                          value={myUsage.allocated_tokens > 0 ? Math.min(100, myUsage.usage_percent) : 0}
                        />
                        <p className={CAPTION_CLASS}>
                          {myUsage.allocated_tokens > 0
                            ? `${Math.max(0, myUsage.remaining_tokens).toLocaleString()} tokens remaining`
                            : isAdmin
                              ? "No token cap set for your own account yet — set one in the Billing tab if you want one."
                              : "No token allocation set for your account yet — ask your workspace admin."}
                        </p>
                      </div>
                    </SettingsGroup>
                  )}
                  {myUsage.allocated_tokens > 0 && myUsage.remaining_tokens <= 0 && !isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      loading={requestingMoreTokens}
                      loadingText="Sending request…"
                      disabled={tokenRequestSent}
                      onClick={handleRequestMoreTokens}
                      className="w-full"
                    >
                      {tokenRequestSent ? "Request sent to admin ✓" : "Request more tokens"}
                    </Button>
                  )}
                </SettingsSection>
              ) : myUsageLoaded ? (
                <p className="font-inter text-xs text-muted-foreground">
                  Your workspace doesn&apos;t have an active DocuLens subscription yet.
                </p>
              ) : null}
            </div>
          )}

          {category === "team" && isAdmin && (
            <div className="space-y-6">
              <SettingsHeader
                icon={Users}
                title="Team members"
                badge={<Badge variant="info">Admin</Badge>}
                description={<>Users you&apos;ve added, up to your package&apos;s limit.</>}
                aside={<Badge variant="secondary">{activeMemberCount}/{maxSubUsers} used</Badge>}
              />

              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddMember)} className={CARD_CLASS}>
                  <FormFieldset busy={addLoading} className="block space-y-4">
                    {addMsg && (
                      <Notice role="status" aria-live="polite" tone={addMsg.type === "ok" ? "success" : "error"}>{addMsg.text}</Notice>
                    )}
                    {atLimit && !membersLoading && (
                      <Notice tone="warning">
  User limit reached. Upgrade your package to add more users.
  </Notice>
                    )}
                    <FormField
                      control={addForm.control}
                      name="newEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_CLASS}>New user email</FormLabel>
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
                      description="Leave blank to use the workspace default as the monthly cap. Daily and weekly limits are set automatically; change them anytime in Billing."
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        loading={addLoading}
                        loadingText="Adding…"
                        disabled={atLimit}
                      >
                        Add user
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={addLoading}
                        onClick={handleCancelAdd}
                      >
                        Cancel
                      </Button>
                    </div>
                  </FormFieldset>
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

              {membersLoading && members.length === 0 ? (
                <div role="status">
                  <span className="sr-only">Loading team members…</span>
                  <ul aria-hidden="true" className={LIST_CLASS}>
                    {Array.from({ length: 4 }, (_, index) => (
                      <li key={index} className="flex items-center gap-3 px-4 py-3">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <Skeleton className={index % 2 === 0 ? "h-4 w-1/3" : "h-4 w-1/4"} />
                          <Skeleton className={index % 2 === 0 ? "h-3 w-3/5" : "h-3 w-1/2"} />
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="hidden sm:block h-5 w-20" />
                          <Skeleton className="size-7 shrink-0" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : members.length > 0 ? (
                <ul className={LIST_CLASS}>
                  {members.map((m) => {
                    const isCurrentUser = m.user_id === user?.user_id;
                    return (
                    <li
                      key={m.user_id}
                      className={cn("flex items-center gap-3 px-4 py-3 font-inter text-xs", ROW_CLASS)}
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground font-manrope text-[11px] font-bold">
                          {m.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">{m.name || m.email}</p>
                          {isCurrentUser && (
                            <Badge variant="secondary">You</Badge>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {m.name ? `${m.email} · ` : ""}Joined {dayjs(m.created_at).format("DD MMM YYYY")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <Badge variant="secondary" className="w-16 justify-center">
                          {m.role === "admin" ? "Admin" : "Member"}
                        </Badge>
                        {statusLoadingId === m.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                        ) : (
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <span className="font-manrope text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
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
                              <IconButton size="sm" label={`Actions for ${m.name || m.email}`} >
                                <DotsGlyph />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <ActionMenuContent>
                              <ActionMenuItem onSelect={() => openEdit(m)}>
                                <MenuIcon><RenameGlyph /></MenuIcon>
                                Edit member
                              </ActionMenuItem>
                              <ActionMenuItem onSelect={() => setResetTarget(m)}>
                                <MenuIcon><KeyRound {...MENU_LUCIDE} /></MenuIcon>
                                Reset password
                              </ActionMenuItem>
                              <ActionMenuSeparator />
                              <ActionMenuItem
                                onSelect={() => setDeleteTarget(m)}
                                danger
                              >
                                <MenuIcon danger><DeleteGlyph /></MenuIcon>
                                Remove member
                              </ActionMenuItem>
                            </ActionMenuContent>
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
                <p className="font-inter text-xs text-muted-foreground">No team members yet.</p>
              )}

              <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        {deleteTarget?.name || deleteTarget?.email} will lose access immediately. Their
                        active sessions will be signed out.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteLoading}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteMember();
                      }}
                      variant="destructive"
                    >
                      {deleteLoading && <ButtonSpinner />}
                      {deleteLoading ? "Removing…" : "Remove member"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog open={!!editTarget} onOpenChange={(open) => !open && !editLoading && setEditTarget(null)}>
                <DialogContent showCloseButton={!editLoading}>
                  <DialogHeader>
                    <DialogTitle>Edit member</DialogTitle>
                    <DialogDescription>
                      {editTarget?.email}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleEditSave)}>
                      <FormFieldset busy={editLoading} className="block space-y-4">
                        <FormInput control={editForm.control} name="name" label="Name" autoComplete="off" disabled={editLoading} />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={editLoading}
                            onClick={() => setEditTarget(null)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" loading={editLoading} loadingText="Saving…">
                            Save changes
                          </Button>
                        </DialogFooter>
                      </FormFieldset>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {category === "billing" && isAdmin && (
            <div className="max-w-2xl space-y-8">
              <SettingsHeader
                icon={CreditCard}
                title="Billing"
                badge={<Badge variant="info">Admin</Badge>}
                description="Plans, invoices, and payment methods."
              />

              {subLoading && !subscription ? (
                <div role="status">
                  <span className="sr-only">Loading subscription…</span>
                  <SettingsGroup aria-hidden="true">
                    <div className="flex items-center justify-between px-5 py-5">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-32" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="space-y-2.5 px-5 py-5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-2/5" />
                      <Skeleton className="h-2 w-full rounded-full" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <div className="grid grid-cols-2 gap-6 px-5 py-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </SettingsGroup>
                </div>
              ) : subError ? (
                <Notice tone="error">{subError}</Notice>
              ) : subscription ? (
                <>
                  <SettingsSection title="Plan">
                    <SettingsGroup>
                      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                        <div className="min-w-0">
                          <p className={LABEL_CLASS}>Current plan</p>
                          <div className="mt-1 flex items-center gap-2.5">
                            <p className="font-manrope text-[26px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
                              {subscription.plan_name}
                            </p>
                            <Badge
                              variant={
                                subscription.subscription_status === "active" && !subscription.cancel_at_period_end
                                  ? "info"
                                  : subscription.cancel_at_period_end
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {subscription.cancel_at_period_end ? "cancelling" : subscription.subscription_status}
                            </Badge>
                          </div>
                        </div>
                        <Button
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
                        >
                          View plans & pricing
                        </Button>
                      </div>

                      {subscription.cancel_at_period_end && (
                        <div className="px-5 py-3">
                          <Notice tone="warning">
                            Subscription cancelled — access continues until{" "}
                            {dayjs(subscription.period_end).format("DD MMM YYYY")}, then it won&apos;t renew.
                          </Notice>
                        </div>
                      )}

                      {subscription.subscription_status === "expired" && pool.planName && (
                        <div className="px-5 py-3">
                          <Notice tone="warning">
                            Plan expired — the workspace is on the {pool.planName} quota (
                            {pool.tokenLimit.toLocaleString()} tokens) until you renew. Member caps still apply.
                          </Notice>
                        </div>
                      )}

                      <div className="space-y-3 px-5 py-5">
                        <div className="flex items-baseline justify-between">
                          <p className={LABEL_CLASS}>Token usage</p>
                          <span className="font-manrope text-[13px] font-bold text-foreground">
                            {subscription.token_limit > 0
                              ? `${Math.round((subscription.token_used / subscription.token_limit) * 100)}%`
                              : "—"}
                          </span>
                        </div>
                        <p className={FIGURE_CLASS}>
                          {subscription.token_used.toLocaleString()}{" "}
                          <span className={FIGURE_UNIT_CLASS}>
                            / {subscription.token_limit.toLocaleString()} tokens
                          </span>
                        </p>
                        <Progress
                          value={
                            subscription.token_limit > 0
                              ? Math.min(100, (subscription.token_used / subscription.token_limit) * 100)
                              : 0
                          }
                        />
                      </div>

                      <div className="grid divide-border sm:grid-cols-3 sm:divide-x">
                        <div className="px-5 py-4">
                          <p className={LABEL_CLASS}>Remaining</p>
                          <p className="mt-0.5 font-manrope text-[15px] font-bold tabular-nums text-foreground">
                            {Math.max(0, subscription.token_remaining).toLocaleString()}
                          </p>
                        </div>
                        <div className="px-5 py-4">
                          <p className={LABEL_CLASS}>Usage period</p>
                          <p className="mt-0.5 font-inter text-[13px] text-foreground">
                            {dayjs(subscription.period_start).format("DD MMM")} –{" "}
                            {dayjs(subscription.period_end).format("DD MMM YYYY")}
                          </p>
                        </div>
                        <div className="px-5 py-4">
                          <p className={LABEL_CLASS}>Token reset</p>
                          <p className="mt-0.5 font-inter text-[13px] text-foreground">
                            {subscription.next_reset_date
                              ? dayjs(subscription.next_reset_date).format("DD MMM YYYY, HH:mm")
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {cancelActionError && (
                        <div className="px-5 py-3">
                          <Notice tone="error">{cancelActionError}</Notice>
                        </div>
                      )}
                    </SettingsGroup>
                  </SettingsSection>

                  {subscription.is_paid && subscription.subscription_status === "active" && (
                    <SettingsSection title="Subscription">
                      <SettingsGroup>
                        {subscription.cancel_at_period_end ? (
                          <SettingRow
                            title="Resume subscription"
                            description={<>Cancelled — access continues until {dayjs(subscription.period_end).format("DD MMM YYYY")}.</>}
                          >
                            <Button
                              variant="outline"
                              loading={cancelActionLoading}
                              loadingText="Resuming…"
                              onClick={handleResumeSubscription}
                            >
                              Resume subscription
                            </Button>
                          </SettingRow>
                        ) : (
                          <SettingRow
                            title="Cancel subscription"
                            description={<>Access continues until {dayjs(subscription.period_end).format("DD MMM YYYY")}, then it won&apos;t renew.</>}
                          >
                            <Button
                              variant="outline"
                              loading={cancelActionLoading}
                              loadingText="Cancelling…"
                              onClick={handleCancelSubscription}
                            >
                              Cancel subscription
                            </Button>
                          </SettingRow>
                        )}
                      </SettingsGroup>
                    </SettingsSection>
                  )}
                </>
              ) : subLoaded ? (
                <Panel tone="dashed" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <IconTile size="lg">
                    <CreditCard className="size-[18px]" />
                  </IconTile>
                  <div>
                    <p className="font-manrope text-[13px] font-bold text-foreground">No active subscription</p>
                    <p className="mx-auto mt-1 max-w-[250px] font-inter text-[11px] leading-relaxed text-muted-foreground">
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
                    className="mt-1"
                  >
                    View plans & pricing
                  </Button>
                </Panel>
              ) : null}

              {tokenRequests.length > 0 && (
                <SettingsSection
                  title="Token requests"
                  description="Members asking for a bigger allocation."
                  aside={<Badge variant="warning">{tokenRequests.length} pending</Badge>}
                >
                  <SettingsGroup>
                    {tokenRequests.map((r) => (
                      <SettingRow
                        key={r.request_id}
                        title={<span className="block truncate">{r.email}</span>}
                        description={
                          <span className="block truncate">
                            {r.message || "Asked for a bigger token allocation"} ·{" "}
                            {dayjs(r.created_at).format("DD MMM, HH:mm")}
                          </span>
                        }
                      >
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          loading={dismissingRequestId === r.request_id}
                          loadingText="Dismissing…"
                          onClick={() => handleDismissRequest(r.request_id)}
                        >
                          Dismiss
                        </Button>
                      </SettingRow>
                    ))}
                  </SettingsGroup>
                </SettingsSection>
              )}

              {subscription && defaultAllocation != null && (
                <SettingsSection title="Defaults">
                  <DefaultAllocationCard
                    value={defaultAllocation}
                    tokenLimit={pool.tokenLimit}
                    saving={defaultAllocationSaving}
                    serverError={defaultAllocationError}
                    onSave={handleSaveDefaultAllocation}
                  />
                </SettingsSection>
              )}

              {subscription && memberUsages.length > 0 && (
                <SettingsSection
                  title="Token allocations"
                  description="Monthly allocations come from the tokens your plan has left this period."
                >
                  <div className="space-y-3">
                    <SettingsGroup>
                      <div className="space-y-2.5 px-5 py-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className={LABEL_CLASS}>Allocated to members</p>
                          <span className="font-inter text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{unallocatedTokens.toLocaleString()}</span> tokens available
                          </span>
                        </div>
                        <p className={FIGURE_CLASS}>
                          {Math.max(0, pool.tokenLimit - unallocatedTokens).toLocaleString()}{" "}
                          <span className={FIGURE_UNIT_CLASS}>/ {pool.tokenLimit.toLocaleString()} tokens</span>
                        </p>
                        <Progress
                          value={pool.tokenLimit > 0 ? Math.min(100, (Math.max(0, pool.tokenLimit - unallocatedTokens) / pool.tokenLimit) * 100) : 0}
                          aria-label="Tokens allocated to members"
                        />
                      </div>
                    </SettingsGroup>

                    <Panel className="overflow-hidden">
                      <div className="hidden items-center gap-3 border-b border-border bg-muted/30 px-5 py-2 font-manrope text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:flex">
                        <span className="flex-[1.2] pl-12">Member</span>
                        <span className="flex-1">Usage this period</span>
                        <span className="w-[144px] shrink-0" aria-hidden="true" />
                      </div>
                      <ul className="divide-y divide-border">
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
                            onClearError={clearAllocationError}
                          />
                        ))}
                      </ul>
                    </Panel>
                  </div>
                </SettingsSection>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
