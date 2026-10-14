import { usageSeverity } from "@/lib/upload-limits";
import type { StorageUsage } from "@/services/payments/type/storage.type";

/** Same severity scale as the token quota bars (a Usage view): primary below 80%, warning from 80%,
 * danger once nothing more fits. `track` and `border` are empty when healthy so the card keeps the
 * plain look of the Usage and Billing cards. */
export function storageTone(usage: Pick<StorageUsage, "usage_percent" | "blocked">) {
  const severity = usageSeverity(usage.usage_percent, usage.blocked);
  if (severity === "full") {
    return {
      bar: "bg-destructive",
      track: "bg-destructive/20",
      border: "border-destructive/40",
      text: "text-danger-ink",
    };
  }
  if (severity === "warn") {
    return {
      bar: "bg-warning",
      track: "bg-warning/20",
      border: "border-warning/40",
      text: "text-warning-ink",
    };
  }
  return {
    bar: "bg-primary",
    track: "",
    border: "",
    text: "text-muted-foreground",
  };
}
