"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, cn } from "@rmsm/ui";
import { getNavigationItems } from "@/lib/navigation";
import type { NavigationItem } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";

/** Mirrors `Sidebar`'s recursive `NavLink` — kept as a separate local
 * copy (rather than a shared export) because this one also needs to
 * close the drawer on navigate, which Sidebar has no equivalent of. */
function NavLink({ item, pathname, depth, onNavigate }: { item: NavigationItem; pathname: string; depth: number; onNavigate: () => void }) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  const linkClassName = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary" aria-hidden="true">
          {item.badge}
        </span>
      )}
      {item.external && <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
    </>
  );

  return (
    <div style={depth > 0 ? { paddingLeft: `${depth * 0.75}rem` } : undefined}>
      {item.external ? (
        <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={linkClassName}>
          {content}
        </a>
      ) : (
        <Link href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={linkClassName}>
          {content}
        </Link>
      )}
      {item.children && item.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavLink key={child.id} item={child} pathname={pathname} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = getNavigationItems({ hasPermission });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col p-0">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LineChart className="h-4 w-4" aria-hidden="true" />
            </div>
            RMSM Trader
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink key={item.id} item={item} pathname={pathname} depth={0} onNavigate={() => onOpenChange(false)} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
