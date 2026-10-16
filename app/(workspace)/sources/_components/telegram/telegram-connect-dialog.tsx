"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/form-password-input";
import { FormRootError } from "@/components/forms/form-root-error";
import { FieldHint } from "@/components/forms/field-hint";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SKELETON_TONE } from "@/lib/skeleton-tones";
import { cn } from "@/lib/utils";
import { useToast, errorToast } from "@/hooks/use-toast";
import { ApiError } from "@/services/api-error";
import { TelegramApi } from "@/services/resources/telegram-api";
import type {
  TelegramConnectionSource,
  TelegramConnectStartResponse,
  TelegramConnectVerifyResponse,
  TelegramDialog,
  TelegramDialogsResponse,
  TelegramSyncResponse,
} from "@/services";
import { Loader2, MessageCircle, Send, CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import {
  telegramAccountSchema,
  telegramCodeSchema,
  telegramPasswordSchema,
  type TelegramAccountValues,
  type TelegramCodeValues,
  type TelegramPasswordValues,
} from "../../_lib/source-forms";

type Step = "form" | "otp" | "password" | "picker" | "syncing" | "done";

const EMPTY_ACCOUNT: TelegramAccountValues = { label: "", apiId: "", apiHash: "", phone: "" };
const EMPTY_CODE: TelegramCodeValues = { code: "" };
const EMPTY_PASSWORD: TelegramPasswordValues = { password: "" };

/** The server's 400 while signing in is a sentence with Telethon's exception text on the end. These
 * read which case it was; the user sees a message of ours, not the exception. */
const isWrongCode = (err: unknown) => err instanceof ApiError && err.status === 400 && err.message.startsWith("Invalid or expired code");
const isExpiredFlow = (err: unknown) => err instanceof ApiError && err.status === 400 && err.message.startsWith("Login session expired");
const EXPIRED_FLOW_MESSAGE = "This sign-in has expired. Close this dialog and start again.";

interface TelegramConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Skip straight to the chat picker for an already-connected account —
   * used by "Add more chats" on an existing connection. */
  existingConnection?: TelegramConnectionSource | null;
  /** Fired once a connection exists and at least one sync attempt has run,
   * so the caller can refresh its connections list. */
  onDone: (connection: TelegramConnectionSource) => void;
}

export function TelegramConnectDialog({
  open,
  onOpenChange,
  existingConnection,
  onDone,
}: TelegramConnectDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);

  // One form per sign-in step: account details, then the login code, then (only for accounts with
  // two-step verification) the cloud password.
  const accountForm = useForm<TelegramAccountValues>({
    resolver: zodResolver(telegramAccountSchema),
    defaultValues: EMPTY_ACCOUNT,
  });
  const codeForm = useForm<TelegramCodeValues>({
    resolver: zodResolver(telegramCodeSchema),
    defaultValues: EMPTY_CODE,
  });
  const passwordForm = useForm<TelegramPasswordValues>({
    resolver: zodResolver(telegramPasswordSchema),
    defaultValues: EMPTY_PASSWORD,
  });
  const [flowId, setFlowId] = useState("");

  // Step: picker
  const [connection, setConnection] = useState<TelegramConnectionSource | null>(null);
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [dialogsLoading, setDialogsLoading] = useState(false);
  const [selectedDialogIds, setSelectedDialogIds] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<TelegramSyncResponse["results"]>([]);

  useEffect(() => {
    if (!open) return;
    if (existingConnection) {
      setConnection(existingConnection);
      setStep("picker");
    } else {
      setStep("form");
    }
  }, [open, existingConnection]);

  useEffect(() => {
    if (step !== "picker" || !connection) return;
    setDialogsLoading(true);
    TelegramApi.dialogs<TelegramDialogsResponse>(connection.connection_id)
      .then((data) => setDialogs(data.dialogs))
      .catch((err) =>
        toast(errorToast("Couldn't load chats", err)),
      )
      .finally(() => setDialogsLoading(false));
  }, [step, connection, toast]);

  const resetAll = () => {
    setStep("form");
    accountForm.reset(EMPTY_ACCOUNT);
    codeForm.reset(EMPTY_CODE);
    passwordForm.reset(EMPTY_PASSWORD);
    setFlowId("");
    setConnection(null);
    setDialogs([]);
    setSelectedDialogIds(new Set());
    setSyncResults([]);
  };

  const handleClose = (next: boolean) => {
    if (!next && submitting) return;
    if (!next) resetAll();
    onOpenChange(next);
  };

  const handleStart = accountForm.handleSubmit((values) => {
    setSubmitting(true);
    return TelegramApi.connectStart<TelegramConnectStartResponse>({
      api_id: Number(values.apiId),
      api_hash: values.apiHash,
      phone: values.phone,
      label: values.label || undefined,
    })
      .then((data) => {
        setFlowId(data.flow_id);
        setStep("otp");
      })
      .catch((err) => {
        // A 400 is Telegram refusing these details (which one it does not say), so it sits above the
        // button for the user to correct. Anything else is a toast.
        if (err instanceof ApiError && err.status === 400) {
          accountForm.setError("root", {
            message: "Telegram did not accept these details. Check the API ID, API hash, and phone number.",
          });
          return;
        }
        toast(errorToast("Couldn't send login code", err, "Check your connection and try again."));
      })
      .finally(() => setSubmitting(false));
  });

  /** Rejects with the server's error; the code and password steps each decide where it shows. */
  const submitVerify = (code: string, password?: string) => {
    setSubmitting(true);
    return TelegramApi.connectVerify<TelegramConnectVerifyResponse>({
      flow_id: flowId,
      code,
      password,
    })
      .then((data) => {
        if (data.status === "password_required") {
          setStep("password");
          return;
        }
        if (data.connection) {
          setConnection(data.connection);
          setStep("picker");
        }
      })
      .finally(() => setSubmitting(false));
  };

  const handleVerifyCode = codeForm.handleSubmit(({ code }) =>
    submitVerify(code).catch((err) => {
      if (isWrongCode(err)) {
        codeForm.setError("code", { message: "This code is wrong or has expired" }, { shouldFocus: true });
      } else if (isExpiredFlow(err)) {
        codeForm.setError("root", { message: EXPIRED_FLOW_MESSAGE });
      } else if (err instanceof ApiError && err.status === 400) {
        codeForm.setError("root", { message: "Telegram did not accept this sign-in. Close this dialog and start again." });
      } else {
        toast(errorToast("Couldn't sign in to Telegram", err, "Check your connection and try again."));
      }
    }),
  );

  const handleVerifyPassword = passwordForm.handleSubmit(({ password }) =>
    submitVerify(codeForm.getValues("code"), password).catch((err) => {
      if (isExpiredFlow(err)) {
        passwordForm.setError("root", { message: EXPIRED_FLOW_MESSAGE });
      } else if (err instanceof ApiError && err.status === 400) {
        // At this step the password is the only thing left that Telegram can refuse.
        passwordForm.setError("password", { message: "Telegram did not accept this password" }, { shouldFocus: true });
      } else {
        toast(errorToast("Couldn't sign in to Telegram", err, "Check your connection and try again."));
      }
    }),
  );

  const submitStep = (event: FormEvent<HTMLFormElement>) => {
    if (step === "form") return handleStart(event);
    if (step === "otp") return handleVerifyCode(event);
    if (step === "password") return handleVerifyPassword(event);
    event.preventDefault();
  };

  const toggleDialog = (id: string) => {
    setSelectedDialogIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSync = () => {
    if (!connection || selectedDialogIds.size === 0) {
      toast({ title: "Select at least one chat to sync", variant: "destructive" });
      return;
    }
    setStep("syncing");
    TelegramApi.sync<TelegramSyncResponse>(connection.connection_id, {
      dialog_ids: Array.from(selectedDialogIds),
    })
      .then((data) => {
        setSyncResults(data.results);
        setStep("done");
      })
      .catch((err) => {
        toast(errorToast("Couldn't sync the chats", err));
        setStep("picker");
      });
  };

  const handleFinish = () => {
    if (connection) onDone(connection);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingConnection ? "Add chats to sync" : "Connect Telegram"}
          </DialogTitle>
          {step === "form" && (
            <DialogDescription>
              Log into your Telegram account so DocuLens can pull existing chat history in —
              not a file export, a live connection you can re-sync anytime.
            </DialogDescription>
          )}
        </DialogHeader>
        {/* One <form> for the dialog: Enter or the footer button submits the current step's form.
            The chat picker and the result list are not forms, so their buttons are plain buttons. */}
        <form noValidate onSubmit={submitStep} className="contents">
        <FormFieldset busy={submitting}>

          {step === "form" && (
            <div className="space-y-3 py-1">
              <FormInput control={accountForm.control} name="label" label="Label (optional)" placeholder="My Telegram" />
              <div className="grid grid-cols-2 items-start gap-3">
                <FormInput control={accountForm.control} name="apiId" label="API ID" inputMode="numeric" autoComplete="off" />
                <FormInput control={accountForm.control} name="apiHash" label="API hash" autoComplete="off" />
              </div>
              <FieldHint>
                From my.telegram.org/apps, under API development tools. One-time per app registration.
              </FieldHint>
              <FormInput control={accountForm.control} name="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+62812xxxxxxx" />
              <FormRootError form={accountForm} />
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-muted-foreground">
                Telegram sent a login code to your account for <strong>{accountForm.getValues("phone")}</strong>.
              </p>
              <FormInput control={codeForm.control} name="code" label="Login code" inputMode="numeric" autoComplete="one-time-code" autoFocus />
              <FormRootError form={codeForm} />
            </div>
          )}

          {step === "password" && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-muted-foreground">
                This account has two-step verification turned on. Enter its cloud password.
              </p>
              <FormPasswordInput control={passwordForm.control} name="password" label="Two-step verification password" autoComplete="current-password" autoFocus />
              <FormRootError form={passwordForm} />
            </div>
          )}

          {step === "picker" && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-muted-foreground">
                Pick which chats or groups to bring in — each becomes a searchable source.
              </p>
              {dialogsLoading ? (
                // Same rows as the real picker (checkbox, title, type), so the list does not jump.
                <div role="status" className="max-h-72 space-y-1.5 overflow-hidden pr-1">
                  <span className="sr-only">Loading chats…</span>
                  <div aria-hidden="true" className="space-y-1.5">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <div key={index} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                        <Skeleton className={cn("size-4 shrink-0", SKELETON_TONE.chip)} />
                        <div className="flex h-4 min-w-0 flex-1 items-center">
                          <Skeleton className={cn("h-[9px]", ["w-2/5", "w-1/3", "w-1/2", "w-[28%]", "w-[45%]"][index])} />
                        </div>
                        <Skeleton className="h-[7px] w-10 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : dialogs.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={MessageCircle}
                  heading="No chats found"
                  description="This Telegram account has no chats to add."
                />
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {dialogs.map((d) => (
                    <label
                      key={d.dialog_id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={selectedDialogIds.has(d.dialog_id)}
                        onCheckedChange={() => toggleDialog(d.dialog_id)}
                      />
                      <TruncatedTooltip label={d.title}>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{d.title}</span>
                      </TruncatedTooltip>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {d.type}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "syncing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Syncing {selectedDialogIds.size} chat{selectedDialogIds.size !== 1 ? "s" : ""} — this can take a moment for long histories…
            </div>
          )}

          {step === "done" && (
            <div className="space-y-2 py-1 max-h-72 overflow-y-auto pr-1">
              {syncResults.map((r) => (
                <div key={r.dialog_id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                  {r.status === "success" ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-success-ink" />
                  ) : (
                    <XCircle className="size-3.5 shrink-0 text-destructive" />
                  )}
                  <TruncatedTooltip label={r.title}>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{r.title}</span>
                  </TruncatedTooltip>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {r.status === "success" ? `${r.message_count} messages` : r.error || "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {step === "form" && (
              <Button
                type="submit"
                loading={submitting}
                loadingText="Sending code…"
                icon={<Send className="size-3.5" />}
              >
                Send login code
              </Button>
            )}
            {step === "otp" && (
              <Button type="submit" loading={submitting} loadingText="Verifying…">
                Verify
              </Button>
            )}
            {step === "password" && (
              <Button type="submit" loading={submitting} loadingText="Verifying…">
                Verify
              </Button>
            )}
            {step === "picker" && (
              <Button
                type="button"
                onClick={handleSync}
                disabled={selectedDialogIds.size === 0}
              >
                Sync {selectedDialogIds.size > 0 ? `${selectedDialogIds.size} ` : ""}chat{selectedDialogIds.size !== 1 ? "s" : ""}
              </Button>
            )}
            {step === "done" && (
              <Button type="button" onClick={handleFinish}>
                Done
              </Button>
            )}
          </DialogFooter>
        </FormFieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
