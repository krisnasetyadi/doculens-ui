"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthChangePwApi, AuthAdminResetPwApi, AuthAdminUsersApi } from "@/services/resources";
import type { TeamMember, TeamMembersResponse } from "@/services/types";
import { AlertCircle, CheckCircle2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  // Change own password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Admin reset
  const [resetEmail, setResetEmail] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetMsg, setResetMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Admin: team members (users created under this admin, capped by package quota)
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [maxSubUsers, setMaxSubUsers] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [addMsg, setAddMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    setMembersLoading(true);
    AuthAdminUsersApi.get<TeamMembersResponse>()
      .then((res) => {
        setMembers(res.members);
        setMaxSubUsers(res.max_sub_users);
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [user?.role]);

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next !== confirm) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    try {
      await AuthChangePwApi.store({ current_password: current, new_password: next });
      setPwMsg({ type: "ok", text: "Password updated successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: unknown) {
      setPwMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to update password." });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleAdminReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg(null);
    setResetLoading(true);
    try {
      await AuthAdminResetPwApi.store({ email: resetEmail, new_password: resetPw });
      setResetMsg({ type: "ok", text: `Password reset for ${resetEmail}.` });
      setResetEmail(""); setResetPw("");
    } catch (err: unknown) {
      setResetMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to reset password." });
    } finally {
      setResetLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    setAddLoading(true);
    try {
      const created = await AuthAdminUsersApi.store<TeamMember>({ email: newEmail, password: newPw });
      setMembers((prev) => [created, ...prev]);
      setAddMsg({ type: "ok", text: `User ${newEmail} added.` });
      setNewEmail(""); setNewPw("");
    } catch (err: unknown) {
      setAddMsg({ type: "err", text: err instanceof Error ? err.message : "Failed to add user." });
    } finally {
      setAddLoading(false);
    }
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
            <form onSubmit={handleChangePw} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="current">Current password</Label>
                <Input id="current" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next">New password</Label>
                <Input id="next" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button
                type="submit"
                disabled={pwLoading}
                className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
              >
                {pwLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {pwLoading ? "Updating…" : "Update password"}
              </Button>
            </form>
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
              <form onSubmit={handleAdminReset} className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">User email</Label>
                  <Input id="resetEmail" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resetPw">New password</Label>
                  <Input id="resetPw" type="password" required minLength={8} value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
                </div>
                <Button type="submit" variant="destructive" disabled={resetLoading} className="rounded-xl font-['Manrope'] font-bold">
                  {resetLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {resetLoading ? "Resetting…" : "Reset password"}
                </Button>
              </form>
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

            <form onSubmit={handleAddMember} className="space-y-4 border-t border-border/60 pt-6">
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
              <div className="space-y-2">
                <Label htmlFor="newEmail">New user email</Label>
                <Input id="newEmail" type="email" required disabled={atLimit} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPw">Temporary password</Label>
                <Input id="newPw" type="password" required minLength={8} disabled={atLimit} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <Button
                type="submit"
                disabled={addLoading || atLimit}
                className="rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
              >
                {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {addLoading ? "Adding…" : "Add user"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
}
