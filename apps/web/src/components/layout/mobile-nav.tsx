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
function NavLink({
  item,
  pathname,
  depth,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  depth: number;
  onNavigate: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  const linkClassName = cn(
    "flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all",
    isActive
      ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_20px_rgba(34,211,238,0.08)]"
      : "border-transparent bg-white/[0.02] text-slate-300 hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          aria-hidden="true"
        >
          {item.badge}
        </span>
      )}
      {item.external && <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
    </>
  );

  return (
    <div style={depth > 0 ? { paddingLeft: `${depth * 0.75}rem` } : undefined}>
      {item.external ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={linkClassName}
        >
          {content}
        </a>
      ) : (
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          className={linkClassName}
        >
          {content}
        </Link>
      )}
      {item.children && item.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavLink
              key={child.id}
              item={child}
              pathname={pathname}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = getNavigationItems({ hasPermission });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="bg-[#07111f]/92 w-[86vw] max-w-[360px] border-r border-white/10 p-0 text-white shadow-2xl backdrop-blur-2xl"
      >
        <SheetHeader className="border-b border-white/10 bg-white/[0.035] px-5 py-4 text-left backdrop-blur-xl">
          <SheetTitle className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
              <LineChart className="h-4 w-4" aria-hidden="true" />
            </div>
            RMSM Trader
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              pathname={pathname}
              depth={0}
              onNavigate={() => onOpenChange(false)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
