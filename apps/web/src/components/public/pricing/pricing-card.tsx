import Link from "next/link";
import { Badge, Button } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { FeatureList, type FeatureListItem } from "@/components/public/features";

export interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: FeatureListItem[];
  cta: { label: string; href: string };
  badge?: string;
  highlighted?: boolean;
  className?: string;
}

/** No pricing logic (Section 10) — `price`/`period` are plain strings the
 * caller supplies, so this component has no opinion on currency,
 * discounts, or billing cycles. Reuses `FeatureList` (see
 * `components/public/features/`) rather than a second checklist
 * implementation. */
export function PricingCard({ name, price, period, description, features, cta, badge, highlighted = false, className }: PricingCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-xl border p-6",
        highlighted ? "border-primary bg-primary/5 shadow-lg" : "border-border",
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{name}</h3>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight">{price}</span>
        {period ? <span className="text-sm text-muted-foreground">{period}</span> : null}
      </div>

      <Button asChild variant={highlighted ? "default" : "outline"}>
        <Link href={cta.href}>{cta.label}</Link>
      </Button>

      <FeatureList items={features} />
    </div>
  );
}
