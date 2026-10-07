import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning className="scroll-smooth [&.dark]:[color-scheme:dark]">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
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
