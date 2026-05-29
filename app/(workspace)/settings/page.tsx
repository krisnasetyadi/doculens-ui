"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthChangePwApi, AuthAdminResetPwApi } from "@/services/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  return (
    <div className="p-8 max-w-xl space-y-8">
      <div>
        <h1 className="font-['Manrope'] text-2xl font-extrabold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences.</p>
      </div>

      {/* Change own password */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your current password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePw}>
          <CardContent className="space-y-4">
            {pwMsg && (
              <p className={`text-sm rounded px-3 py-2 ${pwMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
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
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pwLoading}>{pwLoading ? "Updating…" : "Update password"}</Button>
          </CardFooter>
        </form>
      </Card>

      {/* Admin: reset any user's password */}
      {user?.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Reset user password <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span></CardTitle>
            <CardDescription>Reset the password for any registered user.</CardDescription>
          </CardHeader>
          <form onSubmit={handleAdminReset}>
            <CardContent className="space-y-4">
              {resetMsg && (
                <p className={`text-sm rounded px-3 py-2 ${resetMsg.type === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
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
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="destructive" disabled={resetLoading}>{resetLoading ? "Resetting…" : "Reset password"}</Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
