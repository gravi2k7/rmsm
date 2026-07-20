"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";

/** Derives breadcrumbs from the current pathname rather than requiring
 * every page to declare its own — the two-level structure this admin
 * console actually has (a top-level module, optionally a detail id)
 * doesn't need per-page configuration to get right. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const topLevelItem = NAV_ITEMS.find((item) => item.href === `/${segments[0]}`);
  const crumbs = [
    { label: topLevelItem?.label ?? segments[0], href: topLevelItem?.href ?? `/${segments[0]}` },
    ...segments.slice(1).map((segment, i) => ({
      label: decodeURIComponent(segment),
      href: `/${segments.slice(0, i + 2).join("/")}`,
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
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
    </nav>
  );
}
