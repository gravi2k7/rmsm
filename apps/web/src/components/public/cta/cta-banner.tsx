import Link from "next/link";
import { Button } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { Container } from "@/components/public/container";

interface CTAAction {
  label: string;
  href: string;
}

interface CTABannerProps {
  title: string;
  description?: string;
  primaryCta: CTAAction;
  secondaryCta?: CTAAction;
  className?: string;
}

/** Full-width banner CTA — the most common "ready to get started?" section
 * closer. Inverted (primary background) by default since it's meant to be
 * the visual high point right before the footer. */
export function CTABanner({ title, description, primaryCta, secondaryCta, className }: CTABannerProps) {
  return (
    <section className={cn("bg-primary text-primary-foreground", className)}>
      <Container className="flex flex-col items-center gap-6 py-16 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="max-w-xl text-primary-foreground/80">{description}</p> : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>
          {secondaryCta ? (
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
