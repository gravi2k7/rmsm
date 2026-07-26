import type { Metadata } from "next";
import { seoConfig, siteConfig, socialConfig } from "@/config";

interface BuildMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  /** WM-015R Part 1 — optional per-page keywords. Omitted entirely (rather
   * than defaulted) when a page doesn't pass any, since `Metadata["keywords"]`
   * is itself optional and an empty array is worse than no field at all. */
  keywords?: string[];
}

/** Canonical URL helper (Task 4) — every metadata builder routes through
 * this so canonical/OG URLs never drift from `siteConfig.url`. */
export function canonicalUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * Reusable metadata helper (Task 4). Supports title, description,
 * keywords, OpenGraph, Twitter, canonical, and robots — merges page-specific
 * overrides with the site's defaults so every public route gets
 * consistent SEO tags without repeating boilerplate.
 */
export function buildMetadata({ title, description, path = "/", noIndex = false, keywords }: BuildMetadataOptions = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.shortName}` : siteConfig.name;
  const pageDescription = description ?? siteConfig.description;
  const url = canonicalUrl(path);

  return {
    title: pageTitle,
    description: pageDescription,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : seoConfig.robots,
    openGraph: {
      ...seoConfig.openGraph,
      title: pageTitle,
      description: pageDescription,
      url,
    },
    twitter: {
      ...seoConfig.twitter,
      title: pageTitle,
      description: pageDescription,
      site: socialConfig.twitter.handle,
    },
  };
}

/**
 * WM-015R Part 2 — Schema.org structured data helpers. Each returns a
 * plain JSON-LD object (rendered via `<JsonLd>`, see
 * `components/public/json-ld.tsx`). Every field here traces back to data
 * that already exists in `siteConfig`/`socialConfig`, or to the exact
 * title/description/path a page already passes to `buildMetadata()` —
 * nothing here invents a business fact (revenue, customer count, rating,
 * address, etc.) that isn't already established elsewhere in the codebase.
 */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    sameAs: [socialConfig.twitter.url, socialConfig.linkedin.url, socialConfig.github.url],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function webPageJsonLd({ title, description, path = "/" }: { title?: string; description?: string; path?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title ? `${title} | ${siteConfig.shortName}` : siteConfig.name,
    description: description ?? siteConfig.description,
    url: canonicalUrl(path),
  };
}

export interface BreadcrumbEntry {
  label: string;
  href: string;
}

export function breadcrumbListJsonLd(crumbs: BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: canonicalUrl(crumb.href),
    })),
  };
}
