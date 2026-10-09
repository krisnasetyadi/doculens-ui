"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { safeNextPath } from "@/lib/utils";
import { AuthCardSkeleton, LOGIN_FIELDS } from "../_components/auth-card-skeleton";
import { FormFieldset } from "@/components/forms/form-fieldset";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCardSkeleton
          title="Sign in"
          description="Enter your email and password to continue."
          fields={LOGIN_FIELDS}
          label="Loading sign in…"
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const next = searchParams.get("next");
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to continue.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormFieldset busy={loading} className="block space-y-6">
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
              loading={loading}
              loadingText="Signing in…"
              className="w-full transition-colors"
            >
              Sign in
            </Button>
            <p className="text-sm text-muted-foreground text-center font-inter">
              Don&apos;t have an account?{" "}
              <Link href={registerHref} className="text-primary font-semibold underline-offset-4 hover:underline">
                Register
              </Link>
            </p>
            <p className="text-xs text-muted-foreground/70 text-center font-inter">
              Just looking?{" "}
              <Link href="/pricing" className="text-primary font-semibold underline-offset-4 hover:underline">
                View pricing
              </Link>
            </p>
          </CardFooter>
        </FormFieldset>
      </form>
    </Card>
  );
}
