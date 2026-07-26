import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@rmsm/ui";

/** Frosted/translucent variant of `@rmsm/ui`'s `Card` — a `className`
 * treatment on top of the real primitive, not a reimplementation. Best over
 * a background/gradient/image so the blur has something to show through. */
export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("border-white/10 bg-background/60 shadow-xl backdrop-blur-lg supports-[backdrop-filter]:bg-background/40", className)} {...props} />;
}
