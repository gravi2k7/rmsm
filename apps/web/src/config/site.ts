/**
 * Central site identity + shell config for the public website. Every
 * hardcoded "RMSM"/URL/link string in public components should trace back
 * to here or to navigation.ts/social.ts — see WM-002R Task 14, "everything
 * configurable, no hardcoded links."
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

/** Header logo placeholder (Task 1/14) — swap `text` for a real mark/SVG in
 * a later milestone without touching the Header component itself. */
export const logoConfig = {
  text: siteConfig.shortName,
  href: "/",
} as const;

/** Header CTA + login button targets (Task 1/14). */
export const ctaConfig = {
  login: { label: "Log in", href: "/login" },
  primary: { label: "Get started", href: "/register" },
} as const;

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

/** Footer sections (Task 4) — Platform / Products / Resources / Company /
 * Legal, each config-driven. "Products" and "Legal" are new categories not
 * covered by navigation.ts's mega menu, so they live here alongside the
 * rest of the footer's own config. */
export const footerSections: FooterSection[] = [
  {
    title: "Platform",
    links: [
      { label: "Overview", href: "/platform" },
      { label: "AI", href: "/ai" },
      { label: "Markets", href: "/markets" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/documentation" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Company", href: "/company" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
    ],
  },
];

/** Newsletter signup placeholder (Task 4) — form/submission logic is out of
 * scope for this milestone; the flag lets the footer render the section
 * without wiring anything real yet. */
export const newsletterConfig = {
  enabled: true,
  title: "Stay in the loop",
  description: "Product news and platform updates — no spam.",
} as const;
