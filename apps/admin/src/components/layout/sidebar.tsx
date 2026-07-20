"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart } from "lucide-react";
import { cn } from "@rmsm/ui";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useAuthStore } from "@/lib/auth-store";

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LineChart className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="font-semibold">RMSM Admin</span>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
