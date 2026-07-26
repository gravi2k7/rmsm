import { cn } from "@/lib/utils";
import { AnimatedIn } from "@/components/public/shared";
import { AIFeatureCard, type AIFeatureCardProps } from "./ai-feature-card";

interface AICapabilityGridProps {
  capabilities: AIFeatureCardProps[];
  columns?: 2 | 3;
  className?: string;
}

export function AICapabilityGrid({ capabilities, columns = 3, className }: AICapabilityGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {capabilities.map((capability, i) => (
        <AnimatedIn key={capability.title} variant="slide-up" delayMs={i * 75}>
          <AIFeatureCard {...capability} className="h-full" />
        </AnimatedIn>
      ))}
    </div>
  );
}
