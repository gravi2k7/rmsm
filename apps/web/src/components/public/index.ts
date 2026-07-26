/**
 * Barrel for the public website *shell* (header/footer/nav/etc. — WM-001R/
 * WM-002R). The WM-003R marketing design system deliberately does NOT
 * flatten into this same barrel: several category folders below
 * legitimately re-export the same underlying primitive for discoverability
 * (e.g. both `pricing/` and `features/` re-export `FeatureList`; `pricing/`
 * and `comparison/` both re-export `ComparisonTable`), which would make a
 * single `export *` barrel ambiguous. Import design-system components from
 * their own category instead, e.g. `@/components/public/hero`,
 * `@/components/public/features`, `@/components/public/pricing` — every
 * category folder (hero/, features/, ai/, stats/, logos/, testimonial/,
 * team/, timeline/, process/, pricing/, faq/, cta/, content/, cards/,
 * empty-states/, icons/, comparison/, shared/) is self-barreled via its own
 * index.ts.
 */
export * from "./announcement-bar";
export * from "./breadcrumbs";
export * from "./container";
export * from "./cookie-banner";
export * from "./footer";
export * from "./header";
export * from "./json-ld";
export * from "./mega-menu";
export * from "./mobile-nav";
export * from "./page-shell";
export * from "./route-placeholder";
export * from "./search-trigger";
export * from "./section";
