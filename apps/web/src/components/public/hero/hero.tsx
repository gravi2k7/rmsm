import { Badge } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { Container } from "@/components/public/container";
import { HeroActions } from "./hero-actions";
import { heroBackgroundClass } from "./background";
import type { HeroBaseProps } from "./types";

/**
 * Base Hero — the layout every other variant either wraps or specializes.
 * Exported directly too, for a page that just wants the default treatment
 * without picking a named variant.
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  description,
  primaryCta,
  secondaryCta,
  badge,
  background = "none",
  align = "center",
  theme = "default",
  children,
  className,
}: HeroBaseProps) {
  const inverted = theme === "inverted";

  return (
    <section className={cn("relative overflow-hidden", heroBackgroundClass(background, theme), className)}>
      <Container className={cn("flex flex-col gap-6 py-20 sm:py-28", align === "center" ? "items-center text-center" : "items-start text-left")}>
        {badge ? <Badge variant={inverted ? "outline" : "secondary"}>{badge}</Badge> : null}
        {eyebrow ? (
          <p className={cn("text-sm font-semibold uppercase tracking-wide", inverted ? "text-primary-foreground/80" : "text-primary")}>{eyebrow}</p>
        ) : null}
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {subtitle ? <p className={cn("max-w-2xl text-xl", inverted ? "text-primary-foreground/90" : "text-foreground/90")}>{subtitle}</p> : null}
        {description ? (
          <p className={cn("max-w-2xl text-base", inverted ? "text-primary-foreground/70" : "text-muted-foreground")}>{description}</p>
        ) : null}
        <HeroActions primaryCta={primaryCta} secondaryCta={secondaryCta} inverted={inverted} align={align} />
        {children}
      </Container>
    </section>
  );
}
