import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PricingCards } from "@/components/landing/pricing-cards";
import { PricingComparisonTable } from "@/components/landing/pricing-comparison-table";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <LandingHeader />
      <main className="flex-1 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-['Manrope'] font-bold tracking-[0.2em] uppercase text-primary mb-3">
              Pricing
            </p>
            <h1 className="font-['Manrope'] text-4xl font-extrabold text-foreground mb-4 leading-tight">
              Simple plans.
              <br />
              No surprises.
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto font-['Inter']">
              From trying it out to running a whole team — pick what fits, compare the details below.
            </p>
          </div>

          <PricingCards />

          <div className="mt-20">
            <h2 className="font-['Manrope'] text-2xl font-extrabold text-foreground text-center mb-8">
              Compare plans
            </h2>
            <PricingComparisonTable />
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
