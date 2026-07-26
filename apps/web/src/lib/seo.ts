import type { Metadata } from "next";
import { seoConfig, siteConfig, socialConfig } from "@/config";

interface BuildMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}

/** Canonical URL helper (Task 4) — every metadata builder routes through
 * this so canonical/OG URLs never drift from `siteConfig.url`. */
export function canonicalUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * Reusable metadata helper (Task 4). Supports title, description,
 * OpenGraph, Twitter, canonical, and robots — merges page-specific
 * overrides with the site's defaults so every public route gets
 * consistent SEO tags without repeating boilerplate.
 */
export function buildMetadata({ title, description, path = "/", noIndex = false }: BuildMetadataOptions = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.shortName}` : siteConfig.name;
  const pageDescription = description ?? siteConfig.description;
  const url = canonicalUrl(path);

  return {
    title: pageTitle,
    description: pageDescription,
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
