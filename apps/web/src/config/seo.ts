import type { Metadata } from "next";

/** OpenGraph/Twitter/robots defaults, consumed exclusively by
 * `lib/seo.ts`'s `buildMetadata()`. Page code should never import this
 * directly — go through `buildMetadata()` so every route stays consistent. */
export const seoConfig = {
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  } satisfies Metadata["robots"],
  openGraph: {
    type: "website",
    siteName: "RMSM AI",
    locale: "en_US",
  } satisfies Metadata["openGraph"],
  twitter: {
    card: "summary_large_image",
    site: "@rmsm",
  } satisfies Metadata["twitter"],
} as const;
