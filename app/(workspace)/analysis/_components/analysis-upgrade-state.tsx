import { Lock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

/** What a workspace without Analysis sees instead of its history (MS-916): what it does, which plans
 * have it, and the way to get it. Only an admin can change the plan, so only they get the button. */
export function AnalysisUpgradeState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <EmptyState
        icon={Lock}
        heading="Analysis comes with the Individual and Team plans"
        description={
          "Check your company documents against a reference framework such as ISO 27001: every requirement is " +
          "marked as met, partial or not met, with the evidence found and what to fix, and every result is kept here. " +
          (isAdmin ? "Upgrade your plan to start." : "Ask your workspace admin to upgrade the plan.")
        }
        action={isAdmin ? { label: "Upgrade plan", href: "/pricing" } : undefined}
        ctaVariant="primary"
      />
    </div>
  );
}
