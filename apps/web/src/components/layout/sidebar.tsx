"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListTree, Search } from "lucide-react";
import { cn } from "@rmsm/ui";

const NAV_ITEMS = [
  { href: "/strategies", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/strategies/list", label: "All Strategies", icon: ListTree },
  { href: "/strategies/search", label: "Search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden w-56 shrink-0 border-r bg-card md:block">
      <ul className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
