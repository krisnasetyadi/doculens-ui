import type React from "react";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import "./globals.css";

// Text fonts come through next/font: self-hosted, preloaded, and each gets a metric-adjusted fallback
// (size-adjust and ascent/descent overrides), so the page does not reflow when the real font
// arrives. They are exposed as CSS variables and reached through the font-manrope / font-inter
// utilities (see @theme in globals.css).
const manrope = Manrope({ subsets: ["latin"], variable: "--nf-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--nf-inter", display: "swap" });

export const metadata: Metadata = {
  title: "DocuLens — Document Intelligence",
  description:
    "Query your PDFs, database, and chat logs with natural language using AI",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dark mode only: without color-scheme, every scroller not styled by
  // .custom-scrollbar keeps a light track and thumb on the dark surfaces.
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${inter.variable} scroll-smooth [&.dark]:[color-scheme:dark]`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
        {/* The icon font is not on next/font/google. display=block keeps the ligature name ("hub",
            "arrow_forward") invisible until the font is ready, instead of painting it as text. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
