import Link from "next/link";
import { Button } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { FeatureList, type FeatureListItem } from "@/components/public/features";

interface EnterprisePlanCardProps {
  title: string;
  description: string;
  features: FeatureListItem[];
  cta: { label: string; href: string };
  className?: string;
}

/** Wide, full-bleed "Enterprise" plan banner distinct from `PricingCard` —
 * always contact-sales shaped (no price at all), typically rendered below a
 * `PricingGrid` of self-serve plans. */
export function EnterprisePlanCard({ title, description, features, cta, className }: EnterprisePlanCardProps) {
  return (
    <div className={cn("grid items-center gap-8 rounded-2xl border border-border bg-muted/30 p-8 lg:grid-cols-[2fr_1fr] lg:p-12", className)}>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>
        <div className="mt-6">
          <FeatureList items={features} columns={2} />
        </div>
      </div>
      <div className="flex justify-start lg:justify-end">
        <Button asChild size="lg">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
    </div>
  );
}
