import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { IconWrapper, type IconVariant } from "@/components/public/icons";

interface IconCardProps {
  icon: LucideIcon;
  iconVariant?: IconVariant;
  title: string;
  description?: string;
  className?: string;
}

/** Composes `@rmsm/ui`'s `Card` + this design system's `IconWrapper` — the
 * generic "icon, title, description" tile used across features/AI/CTA. */
export function IconCard({ icon, iconVariant = "muted", title, description, className }: IconCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <IconWrapper icon={icon} variant={iconVariant} />
        <CardTitle className="mt-2">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent />
    </Card>
  );
}
