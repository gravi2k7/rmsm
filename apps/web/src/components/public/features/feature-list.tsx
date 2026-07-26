import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureListItem {
  label: string;
  description?: string;
}

interface FeatureListProps {
  items: FeatureListItem[];
  columns?: 1 | 2;
  className?: string;
}

/** Compact checklist layout — used both standalone (Section 2) and inside
 * pricing cards (Section 10 reuses this rather than a second "what's
 * included" list implementation). */
export function FeatureList({ items, columns = 1, className }: FeatureListProps) {
  return (
    <ul className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-sm">
            {item.label}
            {item.description ? <span className="block text-xs text-muted-foreground">{item.description}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
