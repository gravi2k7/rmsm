import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@rmsm/ui";

export type SectionAlignment = "left" | "center";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: SectionAlignment;
  badge?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard section heading used above every grid/list component in this
 * library (features, pricing, testimonials, FAQ, ...) — one implementation
 * so every marketing section's heading is visually and semantically
 * consistent. `badge` reuses `@rmsm/ui`'s `Badge` rather than a bespoke pill.
 */
export function SectionHeader({ eyebrow, title, description, align = "center", badge, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start text-left", className)}>
      {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
      <h2 className="text-heading-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {description ? <p className="max-w-2xl text-muted-foreground">{description}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
