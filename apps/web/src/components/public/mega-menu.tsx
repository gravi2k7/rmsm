"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, cn } from "@rmsm/ui";
import { megaMenuSections, type MegaMenuSection } from "@/config";

function SectionPanel({ section, onNavigate }: { section: MegaMenuSection; onNavigate?: () => void }) {
  const pathname = usePathname();
  const Icon = section.icon;

  return (
    <div className="w-72 p-2">
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {section.title}
      </div>
      <ul>
        {(section.children ?? []).map((child) => {
          const isActive = pathname === child.href;
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
              >
                <span className="font-medium">{child.label}</span>
                {child.description ? <span className="block text-xs text-muted-foreground">{child.description}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Desktop mega menu (Task 2). Built on `@rmsm/ui`'s Radix-backed
 * `DropdownMenu` rather than a bespoke implementation or a new dependency —
 * no `@radix-ui/react-navigation-menu` is installed anywhere in the
 * workspace, and `DropdownMenu` already gives keyboard navigation, ESC-to-
 * close, and focus management for free. Entirely data-driven from
 * `config/navigation.ts` — no section/link is hardcoded here.
 */
export function MegaMenu() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
      {megaMenuSections.map((section) => {
        const isSectionActive = pathname === section.href || (section.children ?? []).some((c) => c.href === pathname);
        return (
          <DropdownMenu key={section.key}>
            <DropdownMenuTrigger
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                isSectionActive ? "text-foreground" : "text-muted-foreground",
              )}
              aria-current={isSectionActive ? "page" : undefined}
            >
              {section.title}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8}>
              <SectionPanel section={section} />
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
