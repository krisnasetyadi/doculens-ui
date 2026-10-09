"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { TelegramApi } from "@/services/resources/telegram-api";
import type {
  TelegramConnectionSource,
  TelegramConnectStartResponse,
  TelegramConnectVerifyResponse,
  TelegramDialog,
  TelegramDialogsResponse,
  TelegramSyncResponse,
} from "@/services";
import { Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import {
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_PRIMARY_CLASS,
  DIALOG_TITLE_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
} from "../sources-ui";

type Step = "form" | "otp" | "password" | "picker" | "syncing" | "done";

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

  // Step: form
  const [label, setLabel] = useState("");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phone, setPhone] = useState("");
  const [flowId, setFlowId] = useState("");

  // Step: otp / password
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

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
        toast({
          title: "Couldn't load chats",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setDialogsLoading(false));
  }, [step, connection, toast]);

  const resetAll = () => {
    setStep("form");
    setLabel("");
    setApiId("");
    setApiHash("");
    setPhone("");
    setFlowId("");
    setCode("");
    setPassword("");
    setConnection(null);
    setDialogs([]);
    setSelectedDialogIds(new Set());
    setSyncResults([]);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetAll();
    onOpenChange(next);
  };

  const handleStart = () => {
    const parsedApiId = Number(apiId.trim());
    if (!parsedApiId || !apiHash.trim() || !phone.trim()) {
      toast({ title: "Fill in API ID, API hash, and phone number", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    TelegramApi.connectStart<TelegramConnectStartResponse>({
      api_id: parsedApiId,
      api_hash: apiHash.trim(),
      phone: phone.trim(),
      label: label.trim() || undefined,
    })
      .then((data) => {
        setFlowId(data.flow_id);
        setStep("otp");
      })
      .catch((err) =>
        toast({
          title: "Couldn't send login code",
          description: err instanceof Error ? err.message : "Check the API ID/hash and phone number.",
          variant: "destructive",
        }),
      )
      .finally(() => setSubmitting(false));
  };

  const submitVerify = (withPassword?: string) => {
    setSubmitting(true);
    TelegramApi.connectVerify<TelegramConnectVerifyResponse>({
      flow_id: flowId,
      code,
      password: withPassword,
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
      .catch((err) =>
        toast({
          title: "Sign-in failed",
          description: err instanceof Error ? err.message : "Check the code and try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setSubmitting(false));
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      toast({ title: "Enter the code Telegram sent you", variant: "destructive" });
      return;
    }
    submitVerify();
  };

  const handleVerifyPassword = () => {
    if (!password.trim()) {
      toast({ title: "Enter your 2FA password", variant: "destructive" });
      return;
    }
    submitVerify(password.trim());
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
        toast({
          title: "Sync failed",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
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
          <DialogTitle className={DIALOG_TITLE_CLASS}>
            {existingConnection ? "Add chats to sync" : "Connect Telegram"}
          </DialogTitle>
          {step === "form" && (
            <DialogDescription className={DIALOG_DESCRIPTION_CLASS}>
              Log into your Telegram account so DocuLens can pull existing chat history in —
              not a file export, a live connection you can re-sync anytime.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="tg-label" className={FIELD_LABEL_CLASS}>Label (optional)</Label>
              <Input id="tg-label" className={FIELD_INPUT_CLASS} placeholder="My Telegram" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tg-api-id" className={FIELD_LABEL_CLASS}>API ID</Label>
                <Input id="tg-api-id" className={FIELD_INPUT_CLASS} inputMode="numeric" value={apiId} onChange={(e) => setApiId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tg-api-hash" className={FIELD_LABEL_CLASS}>API hash</Label>
                <Input id="tg-api-hash" className={FIELD_INPUT_CLASS} value={apiHash} onChange={(e) => setApiHash(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground">
              From my.telegram.org/apps — API development tools. One-time per app registration.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="tg-phone" className={FIELD_LABEL_CLASS}>Phone number</Label>
              <Input id="tg-phone" className={FIELD_INPUT_CLASS} placeholder="+62812xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Telegram sent a login code to your account for <strong>{phone}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="tg-code">Login code</Label>
              <Input id="tg-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              This account has two-factor authentication enabled — enter its cloud password.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="tg-password">2FA password</Label>
              <Input id="tg-password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
        )}

        {step === "picker" && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Pick which chats or groups to bring in — each becomes a searchable source.
            </p>
            {dialogsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
              </div>
            ) : dialogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No chats found on this account.</p>
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
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{d.title}</span>
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
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-destructive" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{r.title}</span>
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
              onClick={handleStart}
              disabled={submitting}
              className={DIALOG_PRIMARY_CLASS}
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send login code
            </Button>
          )}
          {step === "otp" && (
            <Button onClick={handleVerifyCode} disabled={submitting} className={DIALOG_PRIMARY_CLASS}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Verify
            </Button>
          )}
          {step === "password" && (
            <Button onClick={handleVerifyPassword} disabled={submitting} className={DIALOG_PRIMARY_CLASS}>
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Verify
            </Button>
          )}
          {step === "picker" && (
            <Button
              onClick={handleSync}
              disabled={selectedDialogIds.size === 0}
              className={DIALOG_PRIMARY_CLASS}
            >
              Sync {selectedDialogIds.size > 0 ? `${selectedDialogIds.size} ` : ""}chat{selectedDialogIds.size !== 1 ? "s" : ""}
            </Button>
          )}
          {step === "done" && (
            <Button onClick={handleFinish} className={DIALOG_PRIMARY_CLASS}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
