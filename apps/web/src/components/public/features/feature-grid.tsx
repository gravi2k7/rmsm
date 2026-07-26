import { cn } from "@/lib/utils";
import { AnimatedIn } from "@/components/public/shared";
import { FeatureCard, type FeatureCardProps } from "./feature-card";

interface FeatureGridProps {
  features: FeatureCardProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMN_CLASSES = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Responsive grid of `FeatureCard`s, entirely data-driven — no feature is
 * ever hardcoded inside this component. */
export function FeatureGrid({ features, columns = 3, className }: FeatureGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6", COLUMN_CLASSES[columns], className)}>
      {features.map((feature, i) => (
        <AnimatedIn key={feature.title} variant="slide-up" delayMs={i * 75}>
          <FeatureCard {...feature} className="h-full" />
        </AnimatedIn>
      ))}
    </div>
  );
}
