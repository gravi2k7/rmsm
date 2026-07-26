import type { ReactNode } from "react";

export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroImage {
  src: string;
  alt: string;
}

/**
 * Shared prop contract for every Hero variant (Section 1). One interface so
 * a page can swap `HeroCentered` for `HeroSplit` without touching any of
 * its own data — only the layout changes, never the shape of the content.
 */
export interface HeroBaseProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  /** Reuses `@rmsm/ui`'s `Badge` content, not a custom pill — pass the
   * label text, e.g. "New: AI Copilot". */
  badge?: string;
  /** `"none"` renders on the plain page background; `"gradient"` and
   * `"grid"` are lightweight, token-driven CSS backgrounds — no image
   * assets required. */
  background?: "none" | "gradient" | "grid";
  image?: HeroImage;
  /** Renders a placeholder play-button block instead of an embed — no
   * video player is wired up in this milestone. */
  videoPlaceholder?: boolean;
  align?: "left" | "center";
  /** `"inverted"` forces primary-colored background + foreground text
   * regardless of the site's light/dark mode — for a high-contrast hero
   * regardless of theme. Defaults to the page's normal background/foreground. */
  theme?: "default" | "inverted";
  children?: ReactNode;
  className?: string;
}
