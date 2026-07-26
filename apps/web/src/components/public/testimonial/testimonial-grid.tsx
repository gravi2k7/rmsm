import { cn } from "@/lib/utils";
import { AnimatedIn } from "@/components/public/shared";
import { TestimonialCard, type TestimonialCardProps } from "./testimonial-card";

interface TestimonialGridProps {
  testimonials: TestimonialCardProps[];
  columns?: 2 | 3;
  className?: string;
}

export function TestimonialGrid({ testimonials, columns = 3, className }: TestimonialGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {testimonials.map((testimonial, i) => (
        <AnimatedIn key={testimonial.name} variant="fade" delayMs={i * 75}>
          <TestimonialCard {...testimonial} className="h-full" />
        </AnimatedIn>
      ))}
    </div>
  );
}
