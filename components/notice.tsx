import type { ComponentProps, ComponentType } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type NoticeTone = "success" | "error" | "warning" | "info";

const NOTICE_TONES: Record<NoticeTone, { className: string; Icon: ComponentType<{ className?: string }> }> = {
  success: { className: "bg-success-soft text-success-ink", Icon: CheckCircle2 },
  error: { className: "bg-danger-soft text-danger-ink", Icon: AlertCircle },
  warning: { className: "bg-warning-soft text-warning-ink", Icon: AlertCircle },
  info: { className: "bg-info-soft text-info-ink", Icon: Info },
};

/**
 * Inline feedback: tinted wash, icon, text. `size="sm"` is the short one-line info (a limit that was
 * reached, a note above a list); it is the same in every place it appears. A limit is a warning
 * here, whatever the Usage views in Settings show.
 */
export function Notice({
  tone,
  size = "default",
  children,
  className,
  ...props
}: { tone: NoticeTone; size?: "default" | "sm" } & ComponentProps<"p">) {
  const { className: toneClass, Icon } = NOTICE_TONES[tone];
  return (
    <p
      className={cn(
        "flex gap-2 rounded-lg px-3 font-inter",
        size === "sm" ? "items-center py-2 text-[11px] leading-snug" : "items-start py-2.5 text-xs leading-relaxed",
        toneClass,
        className,
      )}
      {...props}
    >
      <Icon className={cn("size-3.5 shrink-0", size === "default" && "mt-px")} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** The part of a notice that says what happened ("Monthly quota reached"): bold, the rest stays regular. */
export function NoticeLead({ className, ...props }: ComponentProps<"b">) {
  return <b className={cn("font-bold", className)} {...props} />;
}

