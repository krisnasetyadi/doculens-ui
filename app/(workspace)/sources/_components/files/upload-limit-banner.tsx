import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openSettings } from "@/lib/open-settings";
import { formatBytes, type UploadNotice } from "@/lib/upload-limits";

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
        "mb-4 flex items-start gap-3 rounded-xl border px-4 py-3",
        isError ? "border-destructive/30 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isError ? "text-destructive" : "text-amber-600 dark:text-amber-400")} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-['Manrope'] text-sm font-extrabold", isError ? "text-destructive" : "text-amber-700 dark:text-amber-400")}>
          {notice.title}
        </p>
        <p className="mt-0.5 text-sm text-foreground font-['Inter']">{notice.message}</p>

        {notice.results.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {notice.results.map((result, index) => (
              <li
                key={`${result.name}-${index}`}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-['Inter']",
                  result.error ? "bg-destructive/5" : "bg-emerald-500/5",
                )}
              >
                {result.error ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{result.name}</p>
                  {result.error && <p className="text-xs text-destructive">{result.error}</p>}
                </div>
                {result.size !== undefined && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatBytes(result.size)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {notice.quota && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openSettings("storage")}
              className="h-8 rounded-lg font-['Manrope'] text-xs font-bold"
            >
              Manage storage
            </Button>
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() => router.push("/pricing")}
                className="h-8 rounded-lg font-['Manrope'] text-xs font-bold"
              >
                Upgrade plan
              </Button>
            )}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
