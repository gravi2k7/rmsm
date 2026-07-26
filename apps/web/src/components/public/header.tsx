"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ctaConfig, logoConfig, publicAuthLinks } from "@/config";
import { MegaMenu } from "./mega-menu";
import { MobileNav } from "./mobile-nav";
import { SearchTrigger } from "./search-trigger";
import { Container } from "./container";

/**
 * Production-ready public header (Task 1). Sticky with a scroll-triggered
 * border/shadow (no homepage-specific styling — this shell looks the same
 * on every public route). Reuses the dashboard's real `ThemeToggle`
 * (components/layout/theme-toggle.tsx) instead of building a second one,
 * per the "never duplicate providers/components" rule — it already reads
 * the same theme store this layout's `ThemeProvider` drives.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-background/95 backdrop-blur transition-[border-color,box-shadow] motion-reduce:transition-none supports-[backdrop-filter]:bg-background/75",
        scrolled && "border-border shadow-sm",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href={logoConfig.href} className="text-lg font-semibold tracking-tight">
          {logoConfig.text}
        </Link>

        <MegaMenu />

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <SearchTrigger />
          </div>

          <ThemeToggle />

          {publicAuthLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:inline-flex"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href={ctaConfig.primary.href}
            className="hidden rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:inline-flex"
          >
            {ctaConfig.primary.label}
          </Link>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent lg:hidden"
            aria-label="Open menu"
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </Container>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </header>
  );
}
