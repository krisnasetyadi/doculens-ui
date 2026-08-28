"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PLANS, type Plan } from "@/lib/pricing-plans";
import { useAuthStore } from "@/stores/auth-store";

/** A paid plan needs a real account behind it — a guest who checks out
 * without one would have no way to ever sign back into what they paid for.
 * So Individual/Team route through /login first when logged out; Free has
 * nothing to charge (straight to /register); Enterprise is sales-assisted. */
function ctaHref(planId: Plan["id"], isLoggedIn: boolean): string {
  if (planId === "free") return "/register";
  if (planId === "enterprise") return "/home";
  const target = `/payment?plan=${planId}`;
  return isLoggedIn ? target : `/login?next=${encodeURIComponent(target)}`;
}

/** The 4-plan card grid — shared by the landing page's pricing teaser and
 * the full /pricing page, so the pitch never drifts between the two. */
export function PricingCards() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => !!s.user);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
            plan.highlight
              ? "border-primary bg-white dark:bg-white/5 shadow-[0_12px_48px_rgba(74,124,255,0.18)] md:scale-[1.03]"
              : "border-border bg-white/60 dark:bg-white/5 dark:border-white/10"
          }`}
        >
          {plan.highlight && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full font-['Manrope'] tracking-widest uppercase">
              Recommended
            </div>
          )}
          <h4 className="font-['Manrope'] font-extrabold text-lg text-foreground mb-1">
            {plan.name}
          </h4>
          <p className="text-muted-foreground text-sm font-['Inter'] mb-6 min-h-[2.5rem]">
            {plan.tagline}
          </p>
          <div className="mb-6">
            <span className="font-['Manrope'] text-3xl font-extrabold text-foreground">
              {plan.price}
            </span>
            <span className="text-muted-foreground text-sm font-['Inter']">{plan.period}</span>
          </div>
          <ul className="flex-1 space-y-3 mb-8">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground font-['Inter']">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => router.push(ctaHref(plan.id, isLoggedIn))}
            className={
              plan.highlight
                ? "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold"
                : "w-full bg-transparent border border-border text-foreground hover:border-primary hover:text-primary font-['Manrope'] font-semibold"
            }
            variant={plan.highlight ? "default" : "outline"}
          >
            {plan.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}
