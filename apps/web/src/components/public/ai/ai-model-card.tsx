import { Badge } from "@rmsm/ui";
import { cn } from "@/lib/utils";

export interface AIModelCardProps {
  name: string;
  description: string;
  /** e.g. "Reasoning", "Forecasting", "Classification" */
  category?: string;
  /** Free-form spec chips, e.g. ["Real-time", "Low-latency"] — no
   * benchmark numbers implied or required. */
  tags?: string[];
  className?: string;
}

/** Model/engine spotlight card — for a future "under the hood" section.
 * Deliberately has no version numbers, benchmark stats, or provider
 * attribution wired in; those are real content decisions for a later
 * milestone. */
export function AIModelCard({ name, description, category, tags, className }: AIModelCardProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        {category ? <Badge variant="outline">{category}</Badge> : null}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
