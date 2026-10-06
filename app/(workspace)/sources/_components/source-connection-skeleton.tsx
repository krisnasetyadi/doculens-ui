import { Skeleton } from "@/components/ui/skeleton";

export function SourceConnectionSkeleton() {
  return (
    <div role="status" aria-label="Loading source connections" className="space-y-3">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}
