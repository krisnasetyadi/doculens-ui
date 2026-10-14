import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/** Centered logo lockup + ambient orbs shared by the auth pages and the
 * payment flow — keeping this in one place means both stay visually
 * consistent instead of drifting into a third/fourth shell style. */
export function BrandShell({
  children,
  maxWidth = "max-w-md",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Ambient orbs — same treatment as the workspace Home hero */}
      <div className="fixed top-24 right-[12%] w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none" />
      <div className="fixed bottom-20 left-[8%] w-80 h-80 rounded-full bg-primary/[0.05] blur-[110px] pointer-events-none" />

      <div className={`relative z-10 w-full px-4 ${maxWidth}`}>
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <BrandMark />
          <div>
            <h1 className="font-manrope text-base font-extrabold text-foreground leading-none">DocuLens</h1>
            <p className="font-manrope text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 mt-0.5">
              Document Intelligence
            </p>
          </div>
        </Link>
        {children}
      </div>
    </div>
  );
}
