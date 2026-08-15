"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
import { AuthApi } from "@/services/resources/auth-api";
import { FormError } from "@/components/form-error";
import { registerSchema, RegisterFormValues } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: RegisterFormValues) {
    setServerError("");
    setLoading(true);
    AuthApi.register<TokenResponse>({
      name: values.name,
      email: values.email,
      password: values.password,
    })
      .then((res) => {
        login(res.access_token);
        router.push("/home");
      })
      .catch((err: unknown) => {
        setServerError(err instanceof Error ? err.message : "Registration failed.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <Card className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="font-['Manrope'] text-2xl font-extrabold text-foreground">Create account</CardTitle>
        <CardDescription className="font-['Inter']">
          Fill in the details below to get started.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardContent className="space-y-4">
          {serverError && <FormError message={serverError} />}
          <FormInput
            control={form.control}
            name="name"
            label="Full name"
            autoComplete="name"
            autoFocus
            disabled={loading}
          />
          <FormInput
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            disabled={loading}
          />
          <FormPasswordInput
            control={form.control}
            name="password"
            label="Password"
            description="8–72 characters."
            autoComplete="new-password"
            disabled={loading}
          />
          <FormPasswordInput
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
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
            {loading ? "Creating account…" : "Register"}
          </Button>
          <p className="text-sm text-muted-foreground text-center font-['Inter']">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
