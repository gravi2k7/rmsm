import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  /** 0–5, fractional values round down to the nearest whole star. */
  value: number;
  max?: number;
  className?: string;
}

/** Star rating display (Section 6 — testimonial "rating"). Presentational
 * only, not an input. */
export function Rating({ value, max = 5, className }: RatingProps) {
  const filled = Math.max(0, Math.min(max, Math.round(value)));

  return (
    <div role="img" aria-label={`Rated ${value} out of ${max}`} className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("h-4 w-4", i < filled ? "fill-primary text-primary" : "fill-none text-muted-foreground")}
        />
      ))}
    </div>
  );
}
