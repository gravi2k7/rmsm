import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@rmsm/ui";

/** Emphasized-border, no-shadow variant — for dense grids where a shadow on
 * every tile would be visually noisy. */
export function BorderCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("border-2 shadow-none transition-colors hover:border-primary/50", className)} {...props} />;
}
