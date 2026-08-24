import { PLANS, COMPARISON_ROWS } from "@/lib/pricing-plans";

/** Feature-by-feature comparison — lives on the dedicated /pricing page
 * (not the landing teaser) since it's the "wait, what's actually
 * different" follow-up, not the initial pitch. */
export function PricingComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 pr-4 font-['Manrope'] text-muted-foreground font-semibold">
              Feature
            </th>
            {PLANS.map((plan) => (
              <th
                key={plan.id}
                className={`text-center py-3 px-4 font-['Manrope'] font-extrabold ${
                  plan.highlight ? "text-primary" : "text-foreground"
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-border/60">
              <td className="py-3 pr-4 text-muted-foreground font-['Inter']">{row.label}</td>
              {PLANS.map((plan) => {
                const value = row.values[plan.id];
                return (
                  <td key={plan.id} className="text-center py-3 px-4">
                    {typeof value === "boolean" ? (
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          value ? "text-primary" : "text-muted-foreground/30"
                        }`}
                      >
                        {value ? "check" : "remove"}
                      </span>
                    ) : (
                      <span className="text-foreground font-['Inter']">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
