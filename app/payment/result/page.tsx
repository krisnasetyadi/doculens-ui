"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { paymentsApi } from "@/services/payments/handler/payments.api";
import type { PaymentStatus } from "@/services/payments/type/checkout.type";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { NavButton } from "@/components/nav-button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SKELETON_TONE } from "@/lib/skeleton-tones";
import { cn } from "@/lib/utils";

type ResolvedState = "loading" | "idle" | PaymentStatus;

const REDIRECT_SECONDS = 5;
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultSkeleton />}>
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
      paymentsApi.getSessionStatus(sessionId!)
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
    return <PaymentResultSkeleton />;
  }

  if (state === "succeeded") {
    return (
      <ResultCard
        icon={<CheckCircle2 className="h-12 w-12 text-primary" />}
        title="Payment successful"
        description={`This was a test transaction — no real charge was made. Your plan is now active. Redirecting to your workspace in ${Math.max(secondsLeft, 0)}s…`}
        primary={{ label: "Go to Workspace now", href: "/home" }}
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
            ? { label: "Try again", href: `/payment?plan=${planId}` }
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

/**
 * The result card while the outcome is looked up: the card's own shape (icon, title, description,
 * button) with placeholders. The stage text "Confirming your payment…" stays real, because this is
 * a process in progress with retries, not a fixed piece of content.
 */
function PaymentResultSkeleton() {
  return (
    <Card
      role="status"
      aria-busy="true"
    >
      <CardContent className="flex flex-col items-center text-center gap-4 py-10">
        <Skeleton aria-hidden="true" className="size-12 rounded-full" />
        <div className="flex flex-col items-center">
          <h2 className="font-manrope text-xl font-extrabold text-foreground">Confirming your payment…</h2>
          <div aria-hidden="true" className="mt-2 flex w-full max-w-sm flex-col items-center">
            <div className="flex h-5 items-center"><Skeleton className="h-[9px] w-72 max-w-full" /></div>
            <div className="flex h-5 items-center"><Skeleton className="h-[9px] w-48 max-w-full" /></div>
          </div>
        </div>
        <div aria-hidden="true" className="mt-2 flex w-full flex-col gap-3">
          <Skeleton className={cn("h-9 w-full", SKELETON_TONE.chip)} />
        </div>
      </CardContent>
    </Card>
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
  /** A page to go to (the button shows its loading state until it arrives) or an action to run. */
  primary?: { label: string; href?: string; onClick?: () => void };
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center gap-4 py-10">
        {icon}
        <div>
          <h2 className="font-manrope text-xl font-extrabold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground font-inter mt-2 max-w-sm">{description}</p>
        </div>
        <div className="flex flex-col gap-3 w-full mt-2">
          {primary && (
            primary.href ? (
              <NavButton href={primary.href} className="w-full">
                {primary.label}
              </NavButton>
            ) : (
              <Button onClick={primary.onClick} className="w-full">
                {primary.label}
              </Button>
            )
          )}
          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-sm text-primary font-semibold underline-offset-4 hover:underline font-inter"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
