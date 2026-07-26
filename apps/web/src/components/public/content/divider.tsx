import { Separator } from "@rmsm/ui";
import { cn } from "@/lib/utils";

interface DividerProps {
  label?: string;
  className?: string;
}

/** Thin wrapper over `@rmsm/ui`'s `Separator` — not a reimplementation.
 * Adds the marketing-specific "labeled divider" (a centered word breaking a
 * horizontal rule), which the base `Separator` doesn't support. */
export function Divider({ label, className }: DividerProps) {
  if (!label) return <Separator className={className} />;

  return (
    <div className={cn("flex items-center gap-4", className)} role="separator">
      <Separator className="flex-1" />
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}
