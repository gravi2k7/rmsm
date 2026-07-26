import { cn } from "@/lib/utils";
import { Container } from "@/components/public/container";
import { HeroActions } from "./hero-actions";
import type { HeroBaseProps } from "./types";

/**
 * Minimal variant — title + one-line description + optional single CTA,
 * short vertical padding. For interior/utility pages that need a header
 * band without the full hero treatment (e.g. a future "Documentation"
 * landing page).
 */
export function HeroMinimal({ title, description, primaryCta, align = "left", className }: Pick<HeroBaseProps, "title" | "description" | "primaryCta" | "align" | "className">) {
  return (
    <section className={cn("border-b border-border", className)}>
      <Container className={cn("flex flex-col gap-4 py-12", align === "center" ? "items-center text-center" : "items-start text-left")}>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="max-w-xl text-muted-foreground">{description}</p> : null}
        <HeroActions primaryCta={primaryCta} align={align} />
      </Container>
    </section>
  );
}
