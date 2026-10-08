"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import "./globals.css";

// Last resort: only reached when the root layout itself crashes, which also
// takes the layout's <html>, fonts and theme script with it. So this page
// brings its own, and offers a full reload rather than reset(), because the
// tree that failed is the one reset() would try to re-render.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Same rule as the theme script in the root layout. That one is a <script> in
  // server HTML; this page is rendered by the client after the crash, where React
  // does not run inline scripts, so the class is applied here instead.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (saved === "dark" || (saved === null && prefersDark)) document.documentElement.classList.add("dark");
    } catch {}
  }, []);

  return (
    <html lang="en" suppressHydrationWarning className="[&.dark]:[color-scheme:dark]">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg">
            <p className="mb-2 text-center font-manrope text-base font-extrabold">DocuLens</p>
            <EmptyState
              icon={<TriangleAlert />}
              heading="Something went wrong"
              label="DocuLens could not start. Reload the page to try again."
              onUpload={() => window.location.reload()}
              uploadLabel="Reload"
              uploadIcon={<RotateCw className="size-3.5" />}
              ctaVariant="primary"
            />
          </div>
        </div>
      </body>
    </html>
  );
}
