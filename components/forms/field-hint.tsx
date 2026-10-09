import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** The line under a field: help text, or the validation error when `tone="error"`. */
function FieldHint({ tone = "muted", className, ...props }: ComponentProps<"p"> & { tone?: "muted" | "error" }) {
  return (
    <p
      className={cn("text-[11px] leading-4", tone === "error" ? "text-destructive" : "text-muted-foreground", className)}
      {...props}
    />
  );
}

export { FieldHint };
