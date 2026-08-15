"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthApi } from "@/services/resources/auth-api";
import { FormError } from "@/components/form-error";
import { TokenResponse } from "@/services/types";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/form-password-input";
import { loginSchema, LoginFormValues } from "@/lib/validations/auth";

/** Only redirect back to a same-site path — never let ?next send users off-app. */
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/home";
  return next;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginFormValues) {
    if (loading) return;
    setServerError("");
    setLoading(true);
    AuthApi.login<TokenResponse>({
      email: values.email,
      password: values.password,
    })
      .then((res) => {
        login(res.access_token);
        router.push(safeNextPath(searchParams.get("next")));
      })
      .catch((err: unknown) => {
        setServerError(err instanceof Error ? err.message : "Invalid email or password.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <Card className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="font-['Manrope'] text-2xl font-extrabold text-foreground">Sign in</CardTitle>
        <CardDescription className="font-['Inter']">
          Enter your email and password to continue.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardContent className="space-y-4">
          {serverError && <FormError message={serverError} />}
          <FormInput
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            disabled={loading}
          />
          <FormPasswordInput
            control={form.control}
            name="password"
            label="Password"
            autoComplete="current-password"
            disabled={loading}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-muted-foreground text-center font-['Inter']">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
