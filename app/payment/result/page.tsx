"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { PaymentApi } from "@/services/resources/payment-api";
import { PaymentResponse, PaymentStatus } from "@/services/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ResolvedState = "loading" | "idle" | PaymentStatus;

const REDIRECT_SECONDS = 5;
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult />
    </Suspense>
  );
}

function PaymentResult() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const status = searchParams.get("status");
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState<ResolvedState>(status === "cancelled" ? "cancelled" : "loading");
  const [planId, setPlanId] = useState<string | null>(null);
  const [checkNonce, setCheckNonce] = useState(0);
  const toasted = useRef(false);

  useEffect(() => {
    if (status === "cancelled") return; // nothing to look up — Stripe's own cancel_url
    if (!sessionId) {
      setState("idle");
      return;
    }

    let cancelled = false;
    let attempt = 0;

    function check() {
      PaymentApi.getSessionStatus<PaymentResponse>(sessionId!)
        .then((res) => {
          if (cancelled) return;
          if (res.payment.status === "pending" && attempt < MAX_RETRIES) {
            // Webhook may not have landed yet — the checkout redirect and the
            // webhook delivery are a race, so give it a few short retries
            // before treating it as "still processing" instead of failed.
            attempt += 1;
            setTimeout(check, RETRY_DELAY_MS);
            return;
          }
          setPlanId(res.payment.plan_id);
          setState(res.payment.status);
        })
        .catch(() => {
          if (!cancelled) setState("idle");
        });
    }
    setState("loading");
    check();

    return () => {
      cancelled = true;
    };
  }, [status, sessionId, checkNonce]);

  useEffect(() => {
    if (toasted.current) return;
    if (state === "succeeded") {
      toasted.current = true;
      toast({ title: "Payment successful", description: "Test transaction — no real charge was made.", variant: "success" });
    } else if (state === "failed") {
      toasted.current = true;
      toast({ title: "Payment failed", description: "Test transaction — no real charge was made.", variant: "destructive" });
    }
  }, [state, toast]);

  // Success: count down to an automatic redirect into the workspace, same
  // pattern as a "you're all set" screen elsewhere — user can still jump
  // ahead immediately via the button instead of waiting it out.
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  useEffect(() => {
    if (state !== "succeeded") return;
    setSecondsLeft(REDIRECT_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    const redirect = setTimeout(() => router.push("/home"), REDIRECT_SECONDS * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(redirect);
    };
  }, [state, router]);

  if (state === "loading") {
    return (
      <Card className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-['Inter']">Confirming your payment…</p>
        </CardContent>
      </Card>
    );
  }

  if (state === "succeeded") {
    return (
      <ResultCard
        icon={<CheckCircle2 className="h-12 w-12 text-primary" />}
        title="Payment successful"
        description={`This was a test transaction — no real charge was made. Your plan is now active. Redirecting to your workspace in ${Math.max(secondsLeft, 0)}s…`}
        primary={{ label: "Go to Workspace now", onClick: () => router.push("/home") }}
      />
    );
  }

  if (state === "pending") {
    return (
      <ResultCard
        icon={<Loader2 className="h-12 w-12 text-primary animate-spin" />}
        title="Still confirming your payment"
        description="Stripe hasn't told us the outcome yet — this is usually just a few seconds' delay. Check again in a moment."
        primary={{ label: "Check again", onClick: () => setCheckNonce((n) => n + 1) }}
        secondaryHref="/pricing"
        secondaryLabel="Back to pricing"
      />
    );
  }

  if (state === "failed" || state === "cancelled") {
    return (
      <ResultCard
        icon={<XCircle className="h-12 w-12 text-destructive" />}
        title={state === "cancelled" ? "Payment cancelled" : "Payment failed"}
        description="No charge was made — this is a test transaction. You can try again with a different test card."
        primary={
          planId
            ? { label: "Try again", onClick: () => router.push(`/payment?plan=${planId}`) }
            : undefined
        }
        secondaryHref="/pricing"
        secondaryLabel="Back to pricing"
      />
    );
  }

  // idle — direct navigation with nothing to look up
  return (
    <ResultCard
      icon={<XCircle className="h-12 w-12 text-muted-foreground" />}
      title="Nothing to show here"
      description="There's no payment to confirm. Pick a plan to get started."
      secondaryHref="/pricing"
      secondaryLabel="Back to pricing"
    />
  );
}

function ResultCard({
  icon,
  title,
  description,
  primary,
  secondaryHref,
  secondaryLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: { label: string; onClick: () => void };
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <Card className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <CardContent className="flex flex-col items-center text-center gap-4 py-10">
        {icon}
        <div>
          <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground font-['Inter'] mt-2 max-w-sm">{description}</p>
        </div>
        <div className="flex flex-col gap-3 w-full mt-2">
          {primary && (
            <Button
              onClick={primary.onClick}
              className="w-full rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
            >
              {primary.label}
            </Button>
          )}
          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-sm text-primary font-semibold underline-offset-4 hover:underline font-['Inter']"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
