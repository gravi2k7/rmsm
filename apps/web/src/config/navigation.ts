import {
  BookOpen,
  Building2,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * Mega-menu navigation model (WM-002R Task 2). Every top-level section and
 * every link the public header/mobile drawer/footer render is derived from
 * this file — nothing is hardcoded in the components themselves.
 */
export interface MegaMenuChild {
  label: string;
  href: string;
  description?: string;
}

export interface MegaMenuSection {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Where the section title itself links (its "overview" page). */
  href: string;
  /** Sub-links shown in the mega menu panel. Optional so a section can grow
   * from a single overview link into a full panel later without a shape
   * change ("future expansion" per Task 2). */
  children?: MegaMenuChild[];
}

export const megaMenuSections: MegaMenuSection[] = [
  {
    key: "platform",
    title: "Platform",
    description: "The RMSM platform, end to end.",
    icon: LayoutDashboard,
    href: "/platform",
    children: [
      { label: "Overview", href: "/platform", description: "How the platform fits together." },
      { label: "Features", href: "/features", description: "Everything RMSM offers." },
      { label: "Pricing", href: "/pricing", description: "Plans for every desk." },
    ],
  },
  {
    key: "ai",
    title: "AI",
    description: "AI-driven trading intelligence.",
    icon: Sparkles,
    href: "/ai",
    children: [{ label: "Overview", href: "/ai", description: "AI-driven trading intelligence." }],
  },
  {
    key: "markets",
    title: "Markets",
    description: "Real-time market coverage.",
    icon: TrendingUp,
    href: "/markets",
    children: [{ label: "Overview", href: "/markets", description: "Real-time market coverage." }],
  },
  {
    key: "resources",
    title: "Resources",
    description: "Guides, docs, and updates.",
    icon: BookOpen,
    href: "/documentation",
    children: [
      { label: "Documentation", href: "/documentation", description: "Guides and API reference." },
      { label: "Blog", href: "/blog", description: "News and updates from RMSM." },
    ],
  },
  {
    key: "company",
    title: "Company",
    description: "About RMSM.",
    icon: Building2,
    href: "/company",
    children: [
      { label: "Company", href: "/company", description: "About RMSM." },
      { label: "Contact", href: "/contact", description: "Get in touch with RMSM." },
    ],
  },
];

export interface PublicNavLink {
  label: string;
  href: string;
}

/** Flat link list derived from the mega menu — used by the footer, the
 * sitemap, and breadcrumb label lookups so there's exactly one source of
 * truth for "what public pages exist and what they're called." */
export const publicNavLinks: PublicNavLink[] = [
  { label: "Home", href: "/" },
  ...megaMenuSections.flatMap((section) => section.children ?? [{ label: section.title, href: section.href }]),
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
];

export const publicAuthLinks: PublicNavLink[] = [{ label: "Login", href: "/login" }];
