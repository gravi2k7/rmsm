import Link from "next/link";
import { publicAuthLinks, publicNavLinks, siteConfig } from "@/config";
import { Container } from "./container";

/** Placeholder only (Task 7) — structural shell, no menu behavior/styling
 * work. Renders the site name so the public homepage keeps showing
 * "RMSM AI" for the existing health e2e check. */
export function Header() {
  return (
    <header className="border-b border-border">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/">{siteConfig.name}</Link>

        <nav aria-label="Primary">
          {publicNavLinks.map((link) => (
            <Link key={link.href} href={link.href} className="mr-4 text-sm">
              {link.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Account">
          {publicAuthLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm">
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
