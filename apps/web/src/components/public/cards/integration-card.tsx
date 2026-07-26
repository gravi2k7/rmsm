import { Card, CardContent } from "@rmsm/ui";
import { cn } from "@/lib/utils";

interface IntegrationCardProps {
  name: string;
  logoSrc?: string;
  description?: string;
  className?: string;
}

/** Compact logo + name tile for an integrations grid — deliberately
 * smaller/denser than `ProductCard`, since integration grids typically show
 * many more items at once. */
export function IntegrationCard({ name, logoSrc, description, className }: IntegrationCardProps) {
  return (
    <Card className={cn("flex flex-col items-center gap-2 p-4 text-center", className)}>
      <CardContent className="flex flex-col items-center gap-2 p-0">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- config-driven integration logo, see LogoCloud note.
          <img src={logoSrc} alt={name} className="h-8 w-8 object-contain" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <p className="text-sm font-medium">{name}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}
