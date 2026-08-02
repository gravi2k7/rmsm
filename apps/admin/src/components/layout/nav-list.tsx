"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@rmsm/ui";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav-items";
import { useAuthStore } from "@/lib/auth-store";

/** Shared between the desktop `Sidebar` and `MobileNav` — both need the
 * identical flat-items-then-groups rendering, previously duplicated
 * between the two files before Admin UI Milestone A added `NAV_GROUPS`.
 */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_GROUPS.map((g) => [g.label, g.items.some((item) => pathname.startsWith(item.href))])),
  );

  function linkClass(isActive: boolean) {
    return cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );
  }

  return (
    <>
      {NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={linkClass(isActive)}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}

      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => !item.permission || hasPermission(item.permission));
        if (visibleItems.length === 0) return null;
        const GroupIcon = group.icon;
        const isOpen = openGroups[group.label] ?? false;
        return (
          <div key={group.label} className="pt-1">
            <button
              type="button"
              onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <GroupIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="mt-1 space-y-1 border-l pl-4">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={linkClass(isActive)}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
