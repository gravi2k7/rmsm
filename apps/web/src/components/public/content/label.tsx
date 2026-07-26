import { cn } from "@/lib/utils";

interface LabelProps {
  text: string;
  className?: string;
}

/** Small uppercase eyebrow-style label — a standalone version of
 * `SectionHeader`'s `eyebrow` for use outside a section heading (e.g.
 * labeling a single stat or card). */
export function Label({ text, className }: LabelProps) {
  return <span className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>{text}</span>;
}
