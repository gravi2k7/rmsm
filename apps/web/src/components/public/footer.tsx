import { publicNavLinks, siteConfig, socialConfig } from "@/config";
import { Container } from "./container";

/** Placeholder only (Task 7) — structural shell, no styling work. */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="py-8 text-sm">
        <p>
          {siteConfig.name} — {siteConfig.tagline}
        </p>
        <nav aria-label="Footer" className="mt-4">
          {publicNavLinks.map((link) => (
            <a key={link.href} href={link.href} className="mr-4">
              {link.label}
            </a>
          ))}
        </nav>
        <p className="mt-4 text-muted-foreground">
          <a href={socialConfig.twitter.url}>Twitter</a> · <a href={socialConfig.linkedin.url}>LinkedIn</a> ·{" "}
          <a href={socialConfig.github.url}>GitHub</a>
        </p>
      </Container>
    </footer>
  );
}
