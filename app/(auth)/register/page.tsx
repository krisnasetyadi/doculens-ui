"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { FormRootError } from "@/components/forms/form-root-error";
import { ApiError } from "@/services/api-error";
import { useToast, errorToast } from "@/hooks/use-toast";
import { registerSchema, RegisterFormValues } from "@/lib/validations/auth";
import { safeNextPath } from "@/lib/utils";
import { AuthCardSkeleton, REGISTER_FIELDS } from "../_components/auth-card-skeleton";
import { FormFieldset } from "@/components/forms/form-fieldset";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthCardSkeleton
          title="Create account"
          description="Fill in the details below to get started."
          fields={REGISTER_FIELDS}
          label="Loading registration…"
        />
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const next = searchParams.get("next");
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    AuthApi.register<TokenResponse>({
      name: values.name,
      email: values.email,
      password: values.password,
    })
      .then((res) => {
        login(res.access_token);
        router.push(safeNextPath(next));
      })
      .catch((err: unknown) => {
        // "Email already registered" is about the email field, so it shows under it. Any other refusal
        // of what was typed shows above the button. A server or network failure is a toast.
        if (err instanceof ApiError && err.status === 409) {
          form.setError("email", { message: "An account with this email already exists" }, { shouldFocus: true });
          return;
        }
        if (err instanceof ApiError && err.status < 500) {
          form.setError("root", { message: err.message });
          return;
        }
        toast(errorToast("Couldn't create your account", err));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>
          Fill in the details below to get started.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormFieldset busy={loading} className="block space-y-6">
          <CardContent className="space-y-4">
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
            <FormRootError form={form} className="w-full" />
            <Button
              type="submit"
              loading={loading}
              loadingText="Creating account…"
              className="w-full transition-colors"
            >
              Register
            </Button>
            <p className="text-sm text-muted-foreground text-center font-inter">
              Already have an account?{" "}
              <Link href={loginHref} className="text-primary font-semibold underline-offset-4 hover:underline">
                Sign in
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
