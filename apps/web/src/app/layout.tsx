import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/query-provider";
import { JsonLd } from "@/components/public/json-ld";
import { siteConfig } from "@/config";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  title: "RMSM AI",
  description: "Institutional-grade AI trading platform",
  // WM-015R Part 1/9 — lets every nested route's relative OpenGraph/Twitter
  // image URLs (e.g. `opengraph-image.tsx`'s file-convention output)
  // resolve against the real site origin instead of erroring/relative-
  // resolving incorrectly. One-time root-level setting, per Next.js's own
  // Metadata API guidance.
  metadataBase: new URL(siteConfig.url),
};

// WM-015R Part 1 — `viewport` is a separate export from `metadata` as of
// Next.js 14 (colorScheme/themeColor/width moved out of `Metadata` into
// `Viewport`). Previously unset entirely; `themeColor` reuses the exact
// value `manifest.ts` already had, not a new visual decision.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteConfig.themeColor,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* WM-015R Part 2 — Organization + WebSite structured data describes
            the whole site, not one page, so it's injected once here rather
            than repeated on every route. Google explicitly supports JSON-LD
            placed in <body>, not just <head>. */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
