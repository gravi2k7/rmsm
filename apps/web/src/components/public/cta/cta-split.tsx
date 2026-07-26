import Link from "next/link";
import { Button } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { Container } from "@/components/public/container";

interface CTAAction {
  label: string;
  href: string;
}

interface CTASplitProps {
  title: string;
  description?: string;
  primaryCta: CTAAction;
  className?: string;
}

/** Left-aligned title/description with the CTA button on the right on
 * larger screens — a lower-emphasis alternative to `CTABanner` for use
 * mid-page rather than as a page's final closer. */
export function CTASplit({ title, description, primaryCta, className }: CTASplitProps) {
  return (
    <section className={cn("border-y border-border bg-muted/30", className)}>
      <Container className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
      </Container>
    </section>
  );
}
