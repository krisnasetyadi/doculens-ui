import { BrandShell } from "@/components/brand-shell";

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandShell maxWidth="max-w-lg">{children}</BrandShell>;
}
