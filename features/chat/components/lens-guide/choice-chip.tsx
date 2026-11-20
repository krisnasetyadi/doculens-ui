"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A Lens Guide answer chip: clicking it sends its text as the user's reply.
 * A pill (fully rounded), Manrope bold in the one accent colour, no shadow. */
export function ChoiceChip({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-left font-manrope text-[13px] font-bold text-primary-pressed transition-colors dark:text-primary hover:border-primary/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 aria-expanded:border-primary/40 aria-expanded:bg-selected",
        className,
      )}
      {...props}
    />
  );
}
