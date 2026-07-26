import { Badge } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { Container } from "@/components/public/container";
import { HeroActions } from "./hero-actions";
import { HeroMedia } from "./hero-media";
import type { HeroBaseProps } from "./types";

/** Two-column variant — copy on one side, an image/video placeholder on the
 * other. The most common "product hero" shape. */
export function HeroSplit({
  eyebrow,
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  badge,
  image,
  videoPlaceholder,
  className,
}: Omit<HeroBaseProps, "background" | "theme" | "align" | "children">) {
  return (
    <section className={cn("overflow-hidden", className)}>
      <Container className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5 text-left">
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle ? <p className="text-xl text-foreground/90">{subtitle}</p> : null}
          {description ? <p className="text-muted-foreground">{description}</p> : null}
          <HeroActions primaryCta={primaryCta} secondaryCta={secondaryCta} align="left" />
        </div>

        <HeroMedia image={image} videoPlaceholder={videoPlaceholder} />
      </Container>
    </section>
  );
}
