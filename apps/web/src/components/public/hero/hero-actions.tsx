import Link from "next/link";
import { Button } from "@rmsm/ui";
import type { HeroCta } from "./types";

interface HeroActionsProps {
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  inverted?: boolean;
  align?: "left" | "center";
}

/** Shared CTA button pair rendered by every Hero variant — one
 * implementation so the button styling/order never drifts between them. */
export function HeroActions({ primaryCta, secondaryCta, inverted, align = "center" }: HeroActionsProps) {
  if (!primaryCta && !secondaryCta) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${align === "center" ? "justify-center" : "justify-start"}`}>
      {primaryCta ? (
        <Button asChild size="lg" variant={inverted ? "secondary" : "default"}>
          <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
      ) : null}
      {secondaryCta ? (
        <Button asChild size="lg" variant="outline" className={inverted ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" : undefined}>
          <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
