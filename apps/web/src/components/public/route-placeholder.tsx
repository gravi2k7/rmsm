import { PageShell } from "./page-shell";

interface RoutePlaceholderProps {
  title: string;
  description?: string;
}

/** Shared empty-state renderer for every not-yet-built public route (Task 3:
 * "simple placeholder content... do NOT build final UI"). Not one of Task
 * 7's named components — exists so the 10 routes don't each duplicate the
 * same markup. */
export function RoutePlaceholder({ title, description }: RoutePlaceholderProps) {
  return (
    <PageShell className="items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description ?? "This page is coming soon."}</p>
    </PageShell>
  );
}
