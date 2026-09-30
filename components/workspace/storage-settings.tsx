import { AlertCircle, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { storageTone } from "@/components/storage-usage";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/upload-limits";

/** Settings > Storage: how much of the workspace's storage is used. Members
 * see their workspace's numbers, since the quota is shared. The per-file and
 * per-upload limits live in the tooltip of the Sources storage gauge. */
export function StorageSettings({
  isAdmin,
  onViewPlans,
}: {
  isAdmin: boolean;
  onViewPlans: () => void;
}) {
  const { usage, loading, failed } = useStorageUsage();

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
          <HardDrive className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-['Manrope'] text-xl font-extrabold text-foreground">Storage</h2>
          <p className="text-sm text-muted-foreground font-['Inter'] mt-0.5">
            Space used by your workspace&apos;s documents.
          </p>
        </div>
      </div>

      {!usage && loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading storage">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : !usage ? (
        <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {failed ? "Could not load your storage usage. Try again in a moment." : "Storage usage is not available."}
        </p>
      ) : (
        <StorageDetails usage={usage} isAdmin={isAdmin} onViewPlans={onViewPlans} />
      )}
    </div>
  );
}

function StorageDetails({
  usage,
  isAdmin,
  onViewPlans,
}: {
  usage: NonNullable<ReturnType<typeof useStorageUsage>["usage"]>;
  isAdmin: boolean;
  onViewPlans: () => void;
}) {
  const tone = storageTone(usage);
  const healthy = !usage.blocked && usage.usage_percent < 80;
  const used = formatBytes(usage.used_bytes);
  const limit = formatBytes(usage.limit_bytes);

  // Same anatomy as the Usage and Billing cards: a small muted label, the
  // figure in Manrope extrabold, a bar, then a muted caption.
  return (
    <section aria-label="Workspace storage" className={cn("rounded-xl border border-border/60 bg-card p-5 space-y-4", tone.border)}>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-muted-foreground font-['Inter']">Workspace storage</p>
          <span className={cn("font-['Manrope'] text-sm font-bold", healthy ? "text-foreground" : tone.text)}>
            {Math.round(usage.usage_percent)}%
          </span>
        </div>
        <p className="font-['Manrope'] text-2xl font-extrabold text-foreground">
          {used} <span className="text-sm font-normal text-muted-foreground">/ {limit}</span>
        </p>
        <Progress
          value={usage.usage_percent}
          aria-label="Workspace storage used"
          aria-valuenow={usage.usage_percent}
          aria-valuetext={`${used} of ${limit} used`}
          className={tone.track}
          indicatorClassName={tone.bar}
        />
        <p className="text-xs text-muted-foreground font-['Inter']">
          {usage.blocked ? "No space remaining" : `${formatBytes(usage.remaining_bytes)} remaining`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/60">
        <div>
          <p className="text-xs text-muted-foreground font-['Inter']">Current Plan</p>
          <p className="font-['Manrope'] text-lg font-extrabold text-foreground">{usage.plan_name}</p>
        </div>
        {isAdmin && (
          <Button type="button" variant="secondary" size="sm" onClick={onViewPlans} className="font-['Manrope'] font-bold">
            Upgrade plan
          </Button>
        )}
      </div>
    </section>
  );
}
