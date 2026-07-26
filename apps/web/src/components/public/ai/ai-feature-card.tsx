import type { LucideIcon } from "lucide-react";
import { Badge } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

export interface AIFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** e.g. "Beta", "New" — reuses `@rmsm/ui`'s `Badge`. */
  status?: string;
  className?: string;
}

/**
 * AI capability tile (Section 3). Visually distinct from the generic
 * `FeatureCard` via an accent-tinted icon treatment, but built from the
 * same tokens/primitives — deliberately not a fork of `FeatureCard`'s
 * layout logic, just a different icon variant and an optional status badge,
 * since "future-ready placeholder" is the whole point: real AI capability
 * copy doesn't exist yet.
 */
export function AIFeatureCard({ icon, title, description, status, className }: AIFeatureCardProps) {
  return (
    <div className={cn("flex h-full flex-col gap-4 rounded-xl border border-border bg-gradient-to-b from-accent/10 to-transparent p-6", className)}>
      <div className="flex items-start justify-between gap-2">
        <IconWrapper icon={icon} variant="filled" size="lg" />
        {status ? <Badge>{status}</Badge> : null}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
