import { usageSeverity } from "@/lib/upload-limits";
import type { StorageUsage } from "@/services/payments/type/storage.type";

/** Same severity scale as the token quota bars: primary below 80%, amber from
 * 80%, destructive once nothing more fits. `track` and `border` are empty when
 * healthy so the card keeps the plain look of the Usage and Billing cards. */
export function storageTone(usage: Pick<StorageUsage, "usage_percent" | "blocked">) {
  const severity = usageSeverity(usage.usage_percent, usage.blocked);
  if (severity === "full") {
    return {
      bar: "bg-destructive",
      track: "bg-destructive/20",
      border: "border-destructive/40",
      text: "text-destructive",
    };
  }
  if (severity === "warn") {
    return {
      bar: "bg-amber-500",
      track: "bg-amber-500/20",
      border: "border-amber-500/40",
      text: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    bar: "bg-primary",
    track: "",
    border: "",
    text: "text-muted-foreground",
  };
}
