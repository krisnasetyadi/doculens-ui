import Link from "next/link";
import { PricingCards } from "@/components/landing/pricing-cards";

export function LandingPricing() {
  return (
    <section id="pricing" className="relative py-20 px-6 overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background dark:via-[#060d22]" />
      <div className="max-w-6xl mx-auto relative z-10">
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

        <PricingCards />

        <p className="text-center mt-10">
          <Link
            href="/pricing"
            className="text-primary font-['Manrope'] font-semibold text-sm underline-offset-4 hover:underline"
          >
            See full plan comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}
