import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Rating } from "@/components/public/shared";

export interface TestimonialCardProps {
  quote: string;
  name: string;
  title?: string;
  company?: string;
  avatarSrc?: string;
  rating?: number;
  className?: string;
}

export function TestimonialCard({ quote, name, title, company, avatarSrc, rating, className }: TestimonialCardProps) {
  const roleLine = [title, company].filter(Boolean).join(" · ");

  return (
    <figure className={cn("flex h-full flex-col gap-4 rounded-xl border border-border p-6", className)}>
      <Quote className="h-6 w-6 text-primary/40" aria-hidden="true" />
      {rating !== undefined ? <Rating value={rating} /> : null}
      <blockquote className="flex-1 text-sm text-foreground">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar src={avatarSrc} name={name} />
        <div>
          <p className="text-sm font-medium">{name}</p>
          {roleLine ? <p className="text-xs text-muted-foreground">{roleLine}</p> : null}
        </div>
      </figcaption>
    </figure>
  );
}
