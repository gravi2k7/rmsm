/**
 * Central site identity config for the public website. Every hardcoded
 * "RMSM"/URL string in public pages/components should trace back to here —
 * see Task 5's "everything configurable" requirement.
 */
export const siteConfig = {
  name: "RMSM AI",
  shortName: "RMSM",
  tagline: "Institutional-grade AI trading platform",
  description:
    "RMSM is an institutional-grade platform combining real-time market intelligence, strategy execution, portfolio risk management, and AI-driven trading copilots.",
  url: process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000",
  locale: "en_US",
} as const;
