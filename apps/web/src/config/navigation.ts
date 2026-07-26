/**
 * Public navigation model (Task 6). Data only — no nav UI is built here;
 * `components/public/header.tsx` and `footer.tsx` consume this to render
 * minimal, unstyled placeholder links.
 */
export interface PublicNavLink {
  label: string;
  href: string;
}

export const publicNavLinks: PublicNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Platform", href: "/platform" },
  { label: "AI", href: "/ai" },
  { label: "Markets", href: "/markets" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/documentation" },
  { label: "Blog", href: "/blog" },
  { label: "Company", href: "/company" },
  { label: "Contact", href: "/contact" },
];

export const publicAuthLinks: PublicNavLink[] = [{ label: "Login", href: "/login" }];
