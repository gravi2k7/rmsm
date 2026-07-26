import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@rmsm/ui";

/** Subtle accent-tinted gradient background — token-driven (`from-accent/15`),
 * no hardcoded colors, so it flips correctly between light/dark for free. */
export function GradientCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("border-transparent bg-gradient-to-br from-accent/15 via-card to-card", className)} {...props} />;
}
