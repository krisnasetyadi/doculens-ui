import type React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon,
  heading = "No data yet",
  label,
  onUpload,
  uploadLabel = "Upload File",
  uploadIcon,
  secondaryAction,
  ctaVariant = "outline",
}: {
  icon: React.ReactNode;
  heading?: string;
  label: string;
  onUpload?: () => void;
  uploadLabel?: string;
  uploadIcon?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** "outline" (default) for panels where this isn't the page's one CTA;
   * "primary" for a standalone empty page (e.g. History) where it is. */
  ctaVariant?: "outline" | "primary";
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
      <div className="mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">{icon}</div>
      <p className="font-['Manrope'] font-bold text-foreground text-base mb-1">
        {heading}
      </p>
      <p className="text-sm font-['Inter'] text-muted-foreground mb-6">{label}</p>
      <div className="flex items-center gap-3">
        <Button
          onClick={onUpload}
          variant={ctaVariant === "primary" ? "default" : "outline"}
          className={
            ctaVariant === "primary"
              ? "rounded-xl font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
              : "rounded-xl font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          }
        >
          {uploadIcon ?? <Upload className="h-4 w-4" />}
          {uploadLabel}
        </Button>
        {secondaryAction}
      </div>
    </div>
  );
}
