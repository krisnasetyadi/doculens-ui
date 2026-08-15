"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const pricingPlans = [
  {
    name: "Individual",
    price: "Rp 65.000",
    period: "/mo",
    tagline: "For individual researchers & professionals",
    highlight: false,
    features: [
      "1 user",
      "All source types (PDF, Database, Chat, Web Link)",
      "5 GB storage for your documents, chat logs, and data",
      "100% relevant retrieval",
      "Personal search history",
    ],
    cta: "Get Started",
  },
  {
    name: "Team",
    price: "Rp 500.000",
    period: "/mo",
    tagline: "One shared knowledge base for small teams",
    highlight: true,
    features: [
      "5 team members + 1 admin seat",
      "Admin assigns which sources each member can access",
      "1 shared workspace — upload once, everyone can ask",
      "30 GB shared storage",
      "Centralized billing",
      "Priority support",
    ],
    cta: "Choose Team",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For organizations with custom requirements",
    highlight: false,
    features: [
      "Unlimited seats",
      "Custom storage — no fixed limit",
      "SSO & advanced access control",
      "Custom integrations (SharePoint, Google Drive, MongoDB)",
      "SLA & dedicated support",
      "On-premise / private cloud deployment",
    ],
    cta: "Contact Us",
  },
];

export function LandingPricing() {
  const router = useRouter();

  return (
    <section id="pricing" className="relative py-20 px-6 overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background dark:via-[#060d22]" />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary mb-3">
            Pricing
          </p>
          <h3 className="font-['Manrope'] text-4xl font-extrabold text-foreground mb-4 leading-tight">
            Simple plans.
            <br />
            No surprises.
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto font-['Inter']">
            From solo to team — pay for what you need, not empty promises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
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
                <span className="text-muted-foreground text-sm font-['Inter']">
                  {plan.period}
                </span>
              </div>
              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground font-['Inter']">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">
                      check
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => router.push("/home")}
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
      </div>
    </section>
  );
}
