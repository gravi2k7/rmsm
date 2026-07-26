import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

/** Generic inline loading indicator for marketing-page async slots (e.g. a
 * future "live" stat fetched client-side). Distinct from `Skeleton`
 * (`@rmsm/ui`, re-exported below) — this is for "waiting," Skeleton is for
 * "shaping the content that's about to appear." */
export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground", className)}>
      <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
