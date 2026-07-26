import type { MetadataRoute } from "next";
import { publicNavLinks, siteConfig } from "@/config";

/** Lists only the public marketing routes that exist today. Authenticated
 * (app) routes and (auth) flows are intentionally excluded — they require a
 * session and/or are noindex by nature. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = publicNavLinks
    .filter((link) => link.href !== "/")
    .map((link) => ({ url: `${siteConfig.url}${link.href}`, lastModified: now }));

  return [{ url: siteConfig.url, lastModified: now, priority: 1 }, ...entries];
}
