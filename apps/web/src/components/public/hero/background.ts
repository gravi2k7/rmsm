import type { HeroBaseProps } from "./types";

/**
 * Token-driven background treatments — no image assets, no new CSS. `grid`
 * uses a CSS `background-image` linear-gradient trick for a subtle grid
 * rather than an SVG asset, keeping every Hero variant's background
 * zero-request.
 */
export function heroBackgroundClass(background: HeroBaseProps["background"], theme: HeroBaseProps["theme"]): string {
  if (theme === "inverted") return "bg-primary text-primary-foreground";
  if (background === "gradient") return "bg-gradient-to-b from-accent/40 via-background to-background";
  if (background === "grid") {
    return "bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_40%,transparent_100%)]";
  }
  return "";
}
