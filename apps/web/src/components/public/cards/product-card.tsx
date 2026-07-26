import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rmsm/ui";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

export interface ProductCardProps {
  icon?: LucideIcon;
  name: string;
  description: string;
  status?: string;
  href?: string;
  className?: string;
}

/** For a product/module grid (e.g. a future "Platform" page listing
 * Market Intelligence, Strategy Engine, Risk...) — distinct from
 * `FeatureCard` by having a `status` badge slot front and center rather
 * than optional, and by linking the whole title rather than a separate
 * "Learn more" line. */
export function ProductCard({ icon, name, description, status, href, className }: ProductCardProps) {
  return (
    <Card className={cn("group", className)}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        {icon ? <IconWrapper icon={icon} variant="primary" /> : null}
        {status ? <Badge variant="secondary">{status}</Badge> : null}
      </CardHeader>
      <CardContent>
        <CardTitle>
          {href ? (
            <Link href={href} className="inline-flex items-center gap-1 hover:underline">
              {name}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
            </Link>
          ) : (
            name
          )}
        </CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
