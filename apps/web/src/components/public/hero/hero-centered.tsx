import type { HeroBaseProps } from "./types";
import { Hero } from "./hero";

/** Centered variant — the most common marketing hero shape. Force-aligns
 * center regardless of what the caller passes for `align`. */
export function HeroCentered(props: Omit<HeroBaseProps, "align">) {
  return <Hero {...props} align="center" />;
}
