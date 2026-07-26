import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/public/shared";

interface CustomerStoryProps {
  quote: string;
  name: string;
  title?: string;
  company: string;
  avatarSrc?: string;
  logoSrc?: string;
  /** Optional supporting stat/result callout, e.g. "40% faster decisions". */
  stat?: { value: string; label: string };
  media?: ReactNode;
  className?: string;
}

/** Longer-form case-study block — split layout pairing a bigger quote and
 * an optional result stat with a media slot, distinct from the compact grid
 * `TestimonialCard`. */
export function CustomerStory({ quote, name, title, company, avatarSrc, logoSrc, stat, media, className }: CustomerStoryProps) {
  const roleLine = [title, company].filter(Boolean).join(" · ");

  return (
    <div className={cn("grid items-center gap-10 rounded-2xl border border-border p-8 lg:grid-cols-2 lg:p-12", className)}>
      <div className="flex flex-col gap-6">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- config-driven customer logo, see LogoCloud note.
          <img src={logoSrc} alt={company} className="h-8 w-auto" />
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">{company}</p>
        )}
        <blockquote className="text-xl font-medium tracking-tight">&ldquo;{quote}&rdquo;</blockquote>
        <div className="flex items-center gap-3">
          <Avatar src={avatarSrc} name={name} />
          <div>
            <p className="text-sm font-medium">{name}</p>
            {roleLine ? <p className="text-xs text-muted-foreground">{roleLine}</p> : null}
          </div>
        </div>
        {stat ? (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-2xl font-semibold text-primary">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ) : null}
      </div>
      <div>
        {media ?? (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-sm text-muted-foreground">
            Media placeholder
          </div>
        )}
      </div>
    </div>
  );
}
