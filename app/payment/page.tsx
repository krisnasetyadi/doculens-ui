"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PaymentApi } from "@/services/resources/payment-api";
import { CheckoutSessionResponse } from "@/services/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
    <Suspense fallback={null}>
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

  if (!plan || !checkoutable) {
    return null;
  }

  const planId = plan.id;

  function handlePay() {
    if (loading) return;
    setLoading(true);
    PaymentApi.createCheckoutSession<CheckoutSessionResponse>({ plan_id: planId })
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

  return (
    <Card className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <div className="inline-flex items-center gap-2 bg-card border border-border text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-3 font-['Manrope'] tracking-widest uppercase w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
          Test Mode — no real charge
        </div>
        <CardTitle className="font-['Manrope'] text-2xl font-extrabold text-foreground">
          Complete your subscription
        </CardTitle>
        <CardDescription className="font-['Inter']">
          You&apos;re subscribing to the {plan.name} plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="font-['Manrope'] font-bold text-foreground">{plan.name}</p>
            <p className="text-sm text-muted-foreground font-['Inter']">{plan.tagline}</p>
          </div>
          <div className="text-right">
            <p className="font-['Manrope'] text-xl font-extrabold text-foreground">{plan.price}</p>
            <p className="text-xs text-muted-foreground font-['Inter']">{plan.period}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {plan.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground font-['Inter']">
              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-xl font-['Manrope'] font-bold shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {loading ? "Redirecting to Stripe…" : "Pay with Stripe (Test Mode)"}
        </Button>
        <p className="text-sm text-muted-foreground text-center font-['Inter']">
          <a href="/pricing" className="text-primary font-semibold underline-offset-4 hover:underline">
            Back to pricing
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
