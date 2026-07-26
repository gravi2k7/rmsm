import { cn } from "@/lib/utils";
import { PricingCard, type PricingCardProps } from "./pricing-card";

interface PricingGridProps {
  plans: PricingCardProps[];
  className?: string;
}

export function PricingGrid({ plans, className }: PricingGridProps) {
  return (
    <div className={cn("grid grid-cols-1 items-start gap-6 sm:grid-cols-2", plans.length >= 3 && "lg:grid-cols-3", className)}>
      {plans.map((plan) => (
        <PricingCard key={plan.name} {...plan} />
      ))}
    </div>
  );
}
