import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton({
  rows = 4,
  label = "Loading conversations…",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <Skeleton className="mb-2 h-3 w-20" />
        <div className="divide-y divide-border/60">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className={index % 2 === 0 ? "h-4 w-2/3" : "h-4 w-1/2"} />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-4 w-4 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
