import { Skeleton } from "@/components/ui/skeleton";
import { panelVariants } from "@/components/panel";
import { cn } from "@/lib/utils";

export function UsageCardSkeleton({ label = "Loading usage…" }: { label?: string }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={cn(panelVariants({ padding: "lg" }), "space-y-3")}>
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-7 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
