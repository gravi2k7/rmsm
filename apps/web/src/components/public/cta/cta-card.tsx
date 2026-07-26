import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

interface CTAAction {
  label: string;
  href: string;
}

interface CTACardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  cta: CTAAction;
  className?: string;
}

/** Compact, boxed CTA — for a sidebar/grid slot rather than a full-width
 * section (e.g. one card among a `FeatureGrid` promoting documentation). */
export function CTACard({ icon, title, description, cta, className }: CTACardProps) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-xl border border-border p-6", className)}>
      {icon ? <IconWrapper icon={icon} variant="primary" /> : null}
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}
