import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CAPTION_CLASS,
  CARD_CLASS,
  FIGURE_CLASS,
  FIGURE_UNIT_CLASS,
  LABEL_CLASS,
  SettingsHeader,
} from "@/components/workspace/settings-ui";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { storageTone } from "@/components/storage-usage";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/upload-limits";
import { Notice } from "@/components/notice";

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
    <div className="max-w-2xl space-y-8">
      <SettingsHeader icon={HardDrive} title="Storage" description={<>Space used by your workspace&apos;s documents.</>} />

      {!usage && loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading storage…">
          <Skeleton className="h-36" />
          <Skeleton className="h-32" />
        </div>
      ) : !usage ? (
        <Notice tone="error">
          {failed ? "Could not load your storage usage. Try again in a moment." : "Storage usage is not available."}
        </Notice>
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
    <section aria-label="Workspace storage" className={cn(CARD_CLASS, "space-y-4", tone.border)}>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className={LABEL_CLASS}>Workspace storage</p>
          <span className={cn("font-manrope text-[13px] font-bold", healthy ? "text-foreground" : tone.text)}>
            {Math.round(usage.usage_percent)}%
          </span>
        </div>
        <p className={FIGURE_CLASS}>
          {used} <span className={FIGURE_UNIT_CLASS}>/ {limit}</span>
        </p>
        <Progress
          value={usage.usage_percent}
          aria-label="Workspace storage used"
          aria-valuenow={usage.usage_percent}
          aria-valuetext={`${used} of ${limit} used`}
          className={tone.track}
          indicatorClassName={tone.bar}
        />
        <p className={CAPTION_CLASS}>
          {usage.blocked ? "No space remaining" : `${formatBytes(usage.remaining_bytes)} remaining`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className={LABEL_CLASS}>Current Plan</p>
          <p className="font-manrope text-lg font-bold tracking-tight text-foreground">{usage.plan_name}</p>
        </div>
        {isAdmin && (
          <Button type="button" variant="outline" onClick={onViewPlans}>
            Upgrade plan
          </Button>
        )}
      </div>
    </section>
  );
}
