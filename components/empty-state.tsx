import type React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/button-styles";

export function EmptyState({
  icon,
  heading = "Nothing here yet",
  label,
  onUpload,
  uploadLabel = "Add files",
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
    <Empty className="min-h-[22rem] p-8">
      <EmptyHeader className="max-w-sm gap-1.5">
        <EmptyMedia variant="icon" className="mb-3 size-16 rounded-2xl border bg-muted/50 text-muted-foreground [&_svg:not([class*='size-'])]:size-6">
          {icon}
        </EmptyMedia>
        <EmptyTitle className="font-['Manrope'] text-lg font-extrabold tracking-tight">{heading}</EmptyTitle>
        <EmptyDescription className="text-[13px] leading-relaxed">{label}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button
          onClick={onUpload}
          variant={ctaVariant === "primary" ? "default" : "outline"}
          className={ctaVariant === "primary" ? `${PRIMARY_BUTTON_CLASS} flex-none` : `${SECONDARY_BUTTON_CLASS} flex-none`}
        >
          {uploadIcon ?? <Upload className="size-3.5" />}
          {uploadLabel}
        </Button>
        {secondaryAction}
      </EmptyContent>
    </Empty>
  );
}
