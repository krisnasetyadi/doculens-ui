import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openSettings } from "@/lib/open-settings";
import { formatBytes, type UploadNotice } from "@/lib/upload-limits";
import { IconButton } from "@/components/icon-button";

/** Why an upload was refused, inline in the Files card. Stays until it is
 * dismissed, unlike a toast, so the reason is still there after looking away. */
export function UploadLimitBanner({
  notice,
  isAdmin,
  onDismiss,
}: {
  notice: UploadNotice;
  isAdmin: boolean;
  /** Omitted for the standing "storage is full" notice, which only goes away
   * once space is freed. */
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const isError = notice.tone === "error";
  const Icon = isError ? AlertCircle : TriangleAlert;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
        isError ? "border-destructive/30 bg-danger-soft" : "border-warning/30 bg-warning-soft",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isError ? "text-danger-ink" : "text-warning-ink")} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-manrope text-[13px] font-bold", isError ? "text-danger-ink" : "text-warning-ink")}>
          {notice.title}
        </p>
        <p className="mt-0.5 text-xs text-foreground">{notice.message}</p>

        {notice.results.length > 0 && (
          <ul className="mt-2 space-y-1">
            {notice.results.map((result, index) => (
              <li
                key={`${result.name}-${index}`}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs",
                  result.error ? "bg-danger-soft" : "bg-success-soft",
                )}
              >
                {result.error ? (
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger-ink" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-ink" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{result.name}</p>
                  {result.error && <p className="text-[11px] text-danger-ink">{result.error}</p>}
                </div>
                {result.size !== undefined && (
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatBytes(result.size)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {notice.quota && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => openSettings("storage")}
                          >
              Manage storage
            </Button>
            {isAdmin && (
              <Button
                type="button"
                size="xs"
                onClick={() => router.push("/pricing")}
                              >
                Upgrade plan
              </Button>
            )}
          </div>
        )}
      </div>
      {onDismiss && (
        <IconButton size="sm" label="Dismiss" onClick={onDismiss} className="shrink-0">
          <X className="size-3.5" />
        </IconButton>
      )}
    </div>
  );
}
