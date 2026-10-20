import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, TriangleAlert, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { openSettings } from "@/lib/open-settings";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { DANGER_QUIET_TEXT_CLASS } from "@/lib/danger-styles";
import { formatBytes, type UploadNotice } from "@/lib/upload-limits";
import type { StorageUsage } from "@/services/payments/type/storage.type";

type LimitTone = "warning" | "danger";

/** The only colour of a notice: the dot before it. */
const DOTS: Record<LimitTone, string> = {
  warning: "bg-warning",
  danger: "bg-destructive",
};

/** A text action at the end of a notice: the ink colour, medium, underlined, like "Upgrade" in Claude's own limit line. */
function BarAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-sm font-medium text-foreground underline underline-offset-2 outline-none hover:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </button>
  );
}

/** A limit message in the Files tab, as plain as the limit line in Claude: one hairline-bordered line, no fill and no icon, a small coloured dot as the
 * only sign of severity, the what in the ink colour and the why muted, the actions as underlined text at the right. Inset like the rows under it. A
 * batch's per-file results, when there are any, list under the line. */
function StatusBar({
  tone,
  title,
  message,
  actions,
  onDismiss,
  role = "status",
  children,
}: {
  tone: LimitTone;
  title: string;
  message: string;
  actions?: ReactNode;
  onDismiss?: () => void;
  role?: "status" | "alert";
  children?: ReactNode;
}) {
  return (
    <div role={role} className="mx-[11px] mb-3 rounded-lg border border-border px-3 py-2 text-xs leading-5 max-[620px]:mx-[5px]">
      <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1">
        <span aria-hidden="true" className="flex h-5 shrink-0 items-center"><span className={cn("size-1.5 rounded-full", DOTS[tone])} /></span>
        <p className="min-w-[12rem] flex-1">
          <span className="font-medium text-foreground">{title}</span>
          <span className="text-muted-foreground"> · {message}</span>
        </p>
        {actions && <div className="flex shrink-0 items-center gap-3 max-[620px]:order-last max-[620px]:basis-full max-[620px]:pl-4">{actions}</div>}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** The workspace is out of storage, said where the limit bites and nowhere else: a warning icon and two words beside the title, no box. It is red and
 * opens Settings > Storage. The Upload item of the New menu is disabled for the same reason, so the page never nags and never leaves a dead button
 * unexplained. */
export function LimitStatus({ usage }: { usage?: StorageUsage | null }) {
  const detail =
    usage && usage.limit_bytes > 0
      ? `${formatBytes(usage.used_bytes)} of ${formatBytes(usage.limit_bytes)} used. Click to manage storage.`
      : "Storage is full. Click to manage storage.";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => openSettings("storage")}
          aria-label={detail}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-sm text-xs font-medium leading-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-sm:w-full",
            DANGER_QUIET_TEXT_CLASS,
            "hover:underline hover:underline-offset-2",
          )}
        >
          {/* One tone for icon and words, the soft red of "Sign out" and "Delete" in the menus (lib/danger-styles). */}
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          Storage full
        </button>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}

/** Why an upload was refused, inline in the Files card. Stays until it is
 * dismissed, unlike a toast, so the reason is still there after looking away. */
export function UploadLimitBanner({
  notice,
  isAdmin,
  usage,
  onDismiss,
}: {
  notice: UploadNotice;
  isAdmin: boolean;
  /** The workspace's storage; says how full it is in place of the generic sentence. */
  usage?: StorageUsage | null;
  /** Omitted for the standing "storage is full" notice, which only goes away
   * once space is freed. */
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const isError = notice.tone === "error";
  const usageLine = notice.quota && usage && usage.limit_bytes > 0
    ? `${formatBytes(usage.used_bytes)} of ${formatBytes(usage.limit_bytes)} used`
    : null;

  return (
    <StatusBar
      tone={isError ? "danger" : "warning"}
      role={isError ? "alert" : "status"}
      title={notice.title}
      message={usageLine ?? notice.message}
      actions={notice.quota ? (
        <>
          <BarAction onClick={() => openSettings("storage")}>Manage storage</BarAction>
          {isAdmin && <BarAction onClick={() => router.push("/pricing")}>Upgrade plan</BarAction>}
        </>
      ) : undefined}
      onDismiss={onDismiss}
    >
      {notice.results.length > 0 && (
        <ul className="ml-4 mt-1.5 divide-y divide-border border-t border-border">
          {notice.results.map((result, index) => (
            <li key={`${result.name}-${index}`} className="flex items-start gap-2 py-1.5">
              {result.error ? <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger-ink" /> : <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-ink" />}
              <div className="min-w-0 flex-1">
                <TruncatedTooltip label={result.name}>
                  <p className="truncate font-medium text-foreground">{result.name}</p>
                </TruncatedTooltip>
                {result.error && <p className="text-[11px] text-danger-ink">{result.error}</p>}
              </div>
              {result.size !== undefined && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatBytes(result.size)}</span>}
            </li>
          ))}
        </ul>
      )}
    </StatusBar>
  );
}
