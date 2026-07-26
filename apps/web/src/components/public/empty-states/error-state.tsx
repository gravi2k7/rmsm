import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Presentational error boundary content for a marketing-page content slot.
 * Not connected to Next.js's `error.tsx` (that's route-level and already
 * exists) — this is for a smaller in-page section that fails independently. */
export function ErrorState({ title = "Something went wrong", description, action, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <IconWrapper icon={AlertTriangle} variant="filled" size="lg" className="bg-destructive/10 text-destructive" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
