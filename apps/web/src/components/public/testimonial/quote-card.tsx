import { cn } from "@/lib/utils";

interface QuoteCardProps {
  quote: string;
  attribution?: string;
  className?: string;
}

/** Larger, single standalone quote — no avatar/rating, for a pull-quote
 * moment between sections rather than a grid of testimonials. */
export function QuoteCard({ quote, attribution, className }: QuoteCardProps) {
  return (
    <figure className={cn("mx-auto max-w-3xl text-center", className)}>
      <blockquote className="text-2xl font-medium tracking-tight sm:text-3xl">&ldquo;{quote}&rdquo;</blockquote>
      {attribution ? <figcaption className="mt-4 text-sm text-muted-foreground">{attribution}</figcaption> : null}
    </figure>
  );
}
