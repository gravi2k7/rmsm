"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, cn } from "@rmsm/ui";
import { useState } from "react";
import { ctaConfig, logoConfig, megaMenuSections, publicAuthLinks } from "@/config";

/**
 * Mobile drawer (Task 3). Built on `@rmsm/ui`'s Sheet — a thin wrapper
 * around Radix Dialog — which already provides everything Task 3 asks for
 * out of the box: animated open/close (Sheet's own slide transitions),
 * ESC-to-close, outside-click-to-close, and a focus trap. Nothing here
 * reimplements any of that. Sections are collapsible accordions generated
 * from `config/navigation.ts`, matching the desktop mega menu 1:1.
 */
export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full max-w-xs flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{logoConfig.text}</SheetTitle>
        </SheetHeader>

        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {megaMenuSections.map((section) => {
            const isExpanded = expandedKey === section.key;
            const sectionActive = pathname === section.href || (section.children ?? []).some((c) => c.href === pathname);

            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => setExpandedKey(isExpanded ? null : section.key)}
                  aria-expanded={isExpanded}
                  aria-controls={`mobile-nav-section-${section.key}`}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    sectionActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {section.title}
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none", isExpanded && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>

                {isExpanded ? (
                  <ul id={`mobile-nav-section-${section.key}`} className="ml-3 space-y-1 border-l border-border pl-3">
                    {(section.children ?? []).map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => onOpenChange(false)}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                              isActive ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border px-4 py-4">
          {publicAuthLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onOpenChange(false)}
              className="block rounded-md px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={ctaConfig.primary.href}
            onClick={() => onOpenChange(false)}
            className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {ctaConfig.primary.label}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
