import Link from "next/link";
import { Github, Linkedin, Twitter } from "lucide-react";
import { footerSections, newsletterConfig, siteConfig, socialConfig } from "@/config";
import { Container } from "./container";

const SOCIAL_ICONS = { twitter: Twitter, linkedin: Linkedin, github: Github } as const;

/**
 * Production-ready public footer (Task 4). Every section, link, and social
 * icon is driven by `config/site.ts` / `config/social.ts` — nothing here is
 * hardcoded. Newsletter is a placeholder (no submission handler yet, per
 * Task 4's "Newsletter placeholder").
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <Container className="grid gap-10 py-12 md:grid-cols-6">
        <div className="md:col-span-2">
          <p className="text-lg font-semibold">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.tagline}</p>

          {newsletterConfig.enabled ? (
            <form className="mt-6" aria-label="Newsletter signup">
              <label htmlFor="footer-newsletter-email" className="text-sm font-medium">
                {newsletterConfig.title}
              </label>
              <p className="mt-1 text-xs text-muted-foreground">{newsletterConfig.description}</p>
              <div className="mt-2 flex gap-2">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  placeholder="you@company.com"
                  disabled
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  Subscribe
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <Container className="flex flex-col-reverse items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          © {year} {siteConfig.name}. All rights reserved.
        </p>

        <div className="flex items-center gap-3">
          {(Object.entries(socialConfig) as [keyof typeof socialConfig, (typeof socialConfig)[keyof typeof socialConfig]][]).map(
            ([key, profile]) => {
              const Icon = SOCIAL_ICONS[key];
              return (
                <a
                  key={key}
                  href={profile.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={key}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              );
            },
          )}
        </div>
      </Container>
    </footer>
  );
}
