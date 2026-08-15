"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
import { AuthApi } from "@/services/resources/auth-api";
import type { TeamMember, TeamMembersResponse } from "@/services/types";
import { AlertCircle, CheckCircle2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
  adminResetPasswordSchema,
  AdminResetPasswordFormValues,
  addMemberSchema,
  AddMemberFormValues,
} from "@/lib/validations/auth";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  // Change own password
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const pwForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  // Admin reset
  const [resetMsg, setResetMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const resetForm = useForm<AdminResetPasswordFormValues>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { resetEmail: "", resetPw: "" },
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

  useEffect(() => {
    if (user?.role !== "admin") return;
    setMembersLoading(true);
    AuthApi.adminUsers<TeamMembersResponse>()
      .then((res) => {
        setMembers(res.members);
        setMaxSubUsers(res.max_sub_users);
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [user?.role]);

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

  function handleAdminReset(values: AdminResetPasswordFormValues) {
    setResetMsg(null);
    setResetLoading(true);
    AuthApi.adminResetPassword({ email: values.resetEmail, new_password: values.resetPw })
      .then(() => {
        setResetMsg({ type: "ok", text: `Password reset for ${values.resetEmail}.` });
        resetForm.reset();
      })
      .catch((err: unknown) => {
        setResetMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to reset password." });
      })
      .finally(() => {
        setResetLoading(false);
      });
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

  const atLimit = members.length >= maxSubUsers;

  return (
    <div className="h-full overflow-y-auto bg-background">
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div>
        <h1 className="font-['Manrope'] text-2xl font-extrabold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1 font-['Inter']">Manage your account preferences.</p>
      </div>

      {/* Account — change own password, plus admin-only reset, in one container */}
      <Card className="rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Change password</h2>
              <p className="text-sm text-muted-foreground font-['Inter'] mt-1">Update your current password.</p>
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
                <FormField
                  control={pwForm.control}
                  name="current"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pwForm.control}
                  name="next"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pwForm.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
          </section>

          {/* Admin: reset any user's password */}
          {user?.role === "admin" && (
            <section className="space-y-4 border-t border-border/60 pt-8">
              <div>
                <h2 className="flex items-center gap-2 font-['Manrope'] text-xl font-extrabold text-foreground">
                  Reset user password
                  <span className="font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                </h2>
                <p className="text-sm text-muted-foreground font-['Inter'] mt-1">Reset the password for any registered user.</p>
              </div>
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleAdminReset)} className="space-y-4">
                  {resetMsg && (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${resetMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}
                    >
                      {resetMsg.type === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      {resetMsg.text}
                    </p>
                  )}
                  <FormField
                    control={resetForm.control}
                    name="resetEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="resetPw"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="destructive" disabled={resetLoading} className="rounded-xl font-['Manrope'] font-bold">
                    {resetLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {resetLoading ? "Resetting…" : "Reset password"}
                  </Button>
                </form>
              </Form>
            </section>
          )}
        </CardContent>
      </Card>

      {/* Admin: team members — add users under this admin's package quota */}
      {user?.role === "admin" && (
        <Card className="rounded-2xl border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-['Manrope'] text-xl font-extrabold text-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  Team members
                </h2>
                <p className="text-sm text-muted-foreground font-['Inter'] mt-1">
                  Users you&apos;ve added, up to your package&apos;s limit.
                </p>
              </div>
              <span className="shrink-0 font-['Manrope'] text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-full">
                {members.length}/{maxSubUsers} used
              </span>
            </div>

            {membersLoading ? (
              <p className="text-sm text-muted-foreground font-['Inter'] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading team members…
              </p>
            ) : members.length > 0 ? (
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm font-['Inter']">
                    <span className="text-foreground truncate">{m.email}</span>
                    <span className={`shrink-0 text-xs font-bold uppercase tracking-wide ${m.is_active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {m.is_active ? "Active" : "Disabled"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground font-['Inter']">No team members yet.</p>
            )}

            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddMember)} className="space-y-4 border-t border-border/60 pt-6">
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
                        <Input type="email" disabled={atLimit} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="newPw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary password</FormLabel>
                      <FormControl>
                        <Input type="password" disabled={atLimit} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={addLoading || atLimit}
                  className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
                >
                  {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {addLoading ? "Adding…" : "Add user"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
}
