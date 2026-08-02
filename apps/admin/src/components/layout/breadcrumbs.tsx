"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav-items";

/** Derives breadcrumbs from the current pathname rather than requiring
 * every page to declare its own. Extended for Admin UI Milestone A: a
 * grouped nav item's href is two segments (e.g. `/billing/dashboard`),
 * so the first two segments are checked against `NAV_GROUPS` before
 * falling back to the original one-segment `NAV_ITEMS` lookup. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const groupedHref = segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : undefined;
  const groupMatch = groupedHref
    ? NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ group: g, item }))).find(({ item }) => item.href === groupedHref)
    : undefined;

  let crumbs: { label: string; href: string }[];

  if (groupMatch) {
    crumbs = [
      { label: groupMatch.group.label, href: groupMatch.item.href },
      { label: groupMatch.item.label, href: groupMatch.item.href },
      ...segments.slice(2).map((segment, i) => ({
        label: decodeURIComponent(segment),
        href: `/${segments.slice(0, i + 3).join("/")}`,
      })),
    ];
  } else {
    const topLevelItem = NAV_ITEMS.find((item) => item.href === `/${segments[0]}`);
    crumbs = [
      { label: topLevelItem?.label ?? segments[0]!, href: topLevelItem?.href ?? `/${segments[0]}` },
      ...segments.slice(1).map((segment, i) => ({
        label: decodeURIComponent(segment),
        href: `/${segments.slice(0, i + 2).join("/")}`,
      })),
    ];
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href + i} className="flex items-center gap-1.5">
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
