import { cn } from "@/lib/utils";

interface TagProps {
  label: string;
  className?: string;
}

/** Small neutral pill for categorization (e.g. blog/resource tags) —
 * distinct from `@rmsm/ui`'s `Badge` (used for status/emphasis) by being
 * intentionally lower-contrast and never interactive. */
export function Tag({ label, className }: TagProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground", className)}>
      {label}
    </span>
  );
}
