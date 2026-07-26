import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { FeatureIcon } from "./feature-icon";

export interface FeatureCardProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

/** Single feature tile — the atom every `FeatureGrid`/`FeatureList` renders.
 * Works standalone too. */
export function FeatureCard({ icon, title, description, badge, href, linkLabel = "Learn more", className }: FeatureCardProps) {
  return (
    <div className={cn("group flex h-full flex-col gap-4 rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary/40", className)}>
      <div className="flex items-start justify-between gap-2">
        {icon ? <FeatureIcon icon={icon} /> : null}
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
