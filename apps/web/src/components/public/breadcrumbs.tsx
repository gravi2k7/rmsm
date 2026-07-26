"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { publicNavLinks } from "@/config";
import { breadcrumbListJsonLd } from "@/lib/seo";
import { JsonLd } from "./json-ld";

/**
 * Public breadcrumbs (Task 7). Mirrors the pattern already used by the
 * authenticated dashboard's `components/layout/breadcrumbs.tsx` (derive
 * from the pathname, don't require every page to declare its own trail),
 * adapted to label segments from `config/navigation.ts` instead of the
 * dashboard's `NAV_ITEMS`. Hidden on the homepage, where a "Home > Home"
 * trail would be redundant.
 *
 * WM-015R Part 2 — also emits a matching `BreadcrumbList` JSON-LD script
 * from the exact same `crumbs` array used to render the visible trail, so
 * the two can never drift out of sync. This is a client component (needs
 * `usePathname`), so the structured data it emits is client-rendered —
 * acceptable for BreadcrumbList specifically, since it's supplementary
 * (not load-bearing for indexing the way title/description/canonical are).
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const known = publicNavLinks.find((link) => link.href === href);
    const fallback = decodeURIComponent(segment).replace(/-/g, " ");
    return { label: known?.label ?? fallback.charAt(0).toUpperCase() + fallback.slice(1), href };
  });

  return (
    <nav aria-label="Breadcrumb" className="border-b border-border">
      <JsonLd data={breadcrumbListJsonLd([{ label: "Home", href: "/" }, ...crumbs])} />
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <Link href="/" aria-label="Home" className="flex items-center hover:text-foreground">
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
