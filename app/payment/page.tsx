"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { paymentsApi } from "@/services/payments/handler/payments.api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlan } from "@/lib/pricing-plans";

export default function PaymentPage() {
  return (
    <Suspense fallback={<PaymentCard plan={null} loading={false} onPay={() => {}} />}>
      <PaymentSummary />
    </Suspense>
  );
}

function PaymentSummary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const plan = getPlan(searchParams.get("plan"));

  const [loading, setLoading] = useState(false);

  const checkoutable = plan && plan.id !== "enterprise" && plan.id !== "free";

  useEffect(() => {
    if (!checkoutable) {
      router.replace("/pricing");
    }
  }, [checkoutable, router]);

  // Redirecting to /pricing: keep the card's shape on screen instead of a blank page.
  if (!plan || !checkoutable) {
    return <PaymentCard plan={null} loading={false} onPay={() => {}} />;
  }

  const planId = plan.id;

  function handlePay() {
    if (loading) return;
    setLoading(true);
    paymentsApi.createCheckoutSession({ plan_id: planId })
      .then((res) => {
        window.location.href = res.checkout_url;
      })
      .catch((err: unknown) => {
        toast({
          title: "Couldn't start checkout",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      });
  }

  return <PaymentCard plan={plan} loading={loading} onPay={handlePay} />;
}

type Plan = NonNullable<ReturnType<typeof getPlan>>;

/**
 * The summary card. With no plan yet it is the same card with placeholders for the plan's name,
 * price and features, so the page keeps its shape while the plan resolves. The badge, title, pay
 * button and back link are static and stay real.
 */
function PaymentCard({ plan, loading, onPay }: { plan: Plan | null; loading: boolean; onPay: () => void }) {
  return (
    <Card
      className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
      role={plan ? undefined : "status"}
      aria-busy={!plan}
    >
      {!plan && <span className="sr-only">Loading plan…</span>}
      <CardHeader>
        <div className="inline-flex items-center gap-2 bg-card border border-border text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-3 font-manrope tracking-widest uppercase w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
          Test Mode — no real charge
        </div>
        <CardTitle className="font-manrope text-2xl font-extrabold text-foreground">
          Complete your subscription
        </CardTitle>
        <CardDescription className="font-inter">
          {plan ? (
            <>You&apos;re subscribing to the {plan.name} plan.</>
          ) : (
            <span className="flex h-5 items-center">
              <Skeleton className="h-3.5 w-3/5" />
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border p-4 flex items-center justify-between">
          {plan ? (
            <>
              <div>
                <p className="font-manrope font-bold text-foreground">{plan.name}</p>
                <p className="text-sm text-muted-foreground font-inter">{plan.tagline}</p>
              </div>
              <div className="text-right">
                <p className="font-manrope text-xl font-extrabold text-foreground">{plan.price}</p>
                <p className="text-xs text-muted-foreground font-inter">{plan.period}</p>
              </div>
            </>
          ) : (
            <>
              <div aria-hidden="true">
                <div className="flex h-6 items-center"><Skeleton className="h-3.5 w-24" /></div>
                <div className="flex h-5 items-center"><Skeleton className="h-[9px] w-40" /></div>
              </div>
              <div aria-hidden="true" className="flex flex-col items-end">
                <div className="flex h-7 items-center"><Skeleton className="h-4 w-16" /></div>
                <div className="flex h-4 items-center"><Skeleton className="h-[7px] w-12" /></div>
              </div>
            </>
          )}
        </div>
        <ul className="space-y-2">
          {plan
            ? plan.features.slice(0, 3).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground font-inter">
                  <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
                  <span>{f}</span>
                </li>
              ))
            : ["w-4/5", "w-3/5", "w-[70%]"].map((width) => (
                <li key={width} aria-hidden="true" className="flex items-start gap-2">
                  <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                  <span className="flex h-5 flex-1 items-center"><Skeleton className={`h-[9px] ${width}`} /></span>
                </li>
              ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          onClick={onPay}
          loading={loading}
          loadingText="Redirecting to Stripe…"
          disabled={!plan}
          className="w-full rounded-xl font-manrope font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
        >
          Pay with Stripe (Test Mode)
        </Button>
        <p className="text-sm text-muted-foreground text-center font-inter">
          <a href="/pricing" className="text-primary font-semibold underline-offset-4 hover:underline">
            Back to pricing
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
