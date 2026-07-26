import { Badge } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { Container } from "@/components/public/container";
import { HeroActions } from "./hero-actions";
import { HeroMedia } from "./hero-media";
import { heroBackgroundClass } from "./background";
import type { HeroBaseProps } from "./types";

/** Centered copy with a large image/video placeholder stacked underneath —
 * the classic "headline, then a big product screenshot" SaaS hero. */
export function HeroWithImage({
  eyebrow,
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  badge,
  background = "none",
  image,
  videoPlaceholder,
  className,
}: Omit<HeroBaseProps, "theme" | "align" | "children">) {
  return (
    <section className={cn("overflow-hidden", heroBackgroundClass(background, "default"), className)}>
      <Container className="flex flex-col items-center gap-10 py-16 text-center sm:py-24">
        <div className="flex max-w-2xl flex-col items-center gap-5">
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle ? <p className="text-xl text-foreground/90">{subtitle}</p> : null}
          {description ? <p className="text-muted-foreground">{description}</p> : null}
          <HeroActions primaryCta={primaryCta} secondaryCta={secondaryCta} align="center" />
        </div>

        <HeroMedia image={image} videoPlaceholder={videoPlaceholder} className="max-w-4xl" />
      </Container>
    </section>
  );
}
