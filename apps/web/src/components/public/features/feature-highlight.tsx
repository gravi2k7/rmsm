import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FeatureIcon } from "./feature-icon";

interface FeatureHighlightProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  media?: ReactNode;
  reverse?: boolean;
  className?: string;
}

/** Larger, single-feature "spotlight" block — copy on one side, an
 * arbitrary media slot (image, screenshot, embed placeholder — caller
 * supplies it) on the other. For the one or two features a page wants to
 * showcase in more depth than a grid tile allows. */
export function FeatureHighlight({ icon, eyebrow, title, description, media, reverse = false, className }: FeatureHighlightProps) {
  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", className)}>
      <div className={cn("flex flex-col items-start gap-4 text-left", reverse && "lg:order-2")}>
        {icon ? <FeatureIcon icon={icon} variant="primary" /> : null}
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className={cn(reverse && "lg:order-1")}>
        {media ?? (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-sm text-muted-foreground">
            Media placeholder
          </div>
        )}
      </div>
    </div>
  );
}
