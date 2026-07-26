/**
 * Renders a Schema.org JSON-LD `<script>` tag (WM-015R Part 2). `data` is
 * always a plain object built by one of `lib/seo.ts`'s own helpers
 * (`organizationJsonLd`, `websiteJsonLd`, `webPageJsonLd`,
 * `breadcrumbListJsonLd`) — never user input — so `dangerouslySetInnerHTML`
 * here is the standard, safe Next.js pattern for structured data, not an
 * XSS risk. A Server Component (no "use client"), so it never adds to the
 * client bundle.
 */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
