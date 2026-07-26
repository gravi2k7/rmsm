"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { publicNavLinks } from "@/config";

/**
 * Public breadcrumbs (Task 7). Mirrors the pattern already used by the
 * authenticated dashboard's `components/layout/breadcrumbs.tsx` (derive
 * from the pathname, don't require every page to declare its own trail),
 * adapted to label segments from `config/navigation.ts` instead of the
 * dashboard's `NAV_ITEMS`. Hidden on the homepage, where a "Home > Home"
 * trail would be redundant.
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
