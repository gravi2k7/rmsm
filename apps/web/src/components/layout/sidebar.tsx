"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, ExternalLink } from "lucide-react";
import { cn } from "@rmsm/ui";
import { getNavigationItems } from "@/lib/navigation";
import type { NavigationItem } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useUiStore } from "@/store/use-ui-store";

/**
 * Renders one navigation item and recursively renders children.
 *
 * The collapsed sidebar keeps icons visible while hiding labels.
 * Native `title` attributes provide an accessible browser tooltip for
 * collapsed navigation items without introducing another UI dependency.
 */
function NavLink({
  item,
  pathname,
  depth,
  collapsed,
}: {
  item: NavigationItem;
  pathname: string;
  depth: number;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  const Icon = item.icon;

  const linkClassName = cn(
    "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
    collapsed
      ? "justify-center px-2"
      : "gap-3 px-3",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />

      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}

      {!collapsed && item.badge && (
        <span
          className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
          aria-hidden="true"
        >
          {item.badge}
        </span>
      )}

      {!collapsed && item.external && (
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <div
      style={
        !collapsed && depth > 0
          ? { paddingLeft: `${depth * 0.75}rem` }
          : undefined
      }
    >
      {item.external ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          title={collapsed ? item.label : undefined}
        >
          {content}
        </a>
      ) : (
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={linkClassName}
          title={collapsed ? item.label : undefined}
        >
          {content}
        </Link>
      )}

      {item.children && item.children.length > 0 && !collapsed && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavLink
              key={child.id}
              item={child}
              pathname={pathname}
              depth={depth + 1}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const hasPermission = useAuthStore((s) => s.hasPermission);

  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  const items = getNavigationItems({ hasPermission });

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r bg-card md:flex md:flex-col",
        "transition-[width] duration-200 ease-in-out",
        sidebarOpen ? "w-64" : "w-16",
      )}
      aria-label="Main sidebar"
    >
      <div
        className={cn(
          "relative flex h-16 shrink-0 items-center border-b",
          sidebarOpen
            ? "justify-between px-4"
            : "justify-center px-2",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center",
            sidebarOpen ? "gap-2" : "justify-center",
          )}
          aria-label="RMSM Trader home"
          title={!sidebarOpen ? "RMSM Trader" : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-4 w-4" aria-hidden="true" />
          </div>

          {sidebarOpen && (
            <span className="font-semibold">RMSM Trader</span>
          )}
        </Link>

      </div>

      <nav
        aria-label="Main navigation"
        className={cn(
          "flex-1 overflow-y-auto py-4",
          sidebarOpen ? "space-y-1 px-3" : "space-y-1 px-2",
        )}
      >
        {items.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            pathname={pathname}
            depth={0}
            collapsed={!sidebarOpen}
          />
        ))}
      </nav>
    </aside>
  );
}
