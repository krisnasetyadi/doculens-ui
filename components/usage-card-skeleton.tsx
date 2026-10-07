import { Skeleton } from "@/components/ui/skeleton";

export function UsageCardSkeleton({ label = "Loading usage…" }: { label?: string }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3 rounded-[14px] border border-border bg-card p-5 shadow-xs">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-7 w-12 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
