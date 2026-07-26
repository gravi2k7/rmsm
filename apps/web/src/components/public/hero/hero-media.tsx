import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeroImage } from "./types";

interface HeroMediaProps {
  image?: HeroImage;
  videoPlaceholder?: boolean;
  className?: string;
}

/** Shared media slot for `HeroSplit`/`HeroWithImage` — renders a real image
 * when given one, a play-button placeholder when `videoPlaceholder` is set
 * (no video player is wired up this milestone), or a neutral placeholder
 * block when neither is provided, so the layout never collapses. */
export function HeroMedia({ image, videoPlaceholder, className }: HeroMediaProps) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- config-driven hero art; next/image remote-pattern config is out of scope for a shell-only design system.
      <img src={image.src} alt={image.alt} className={cn("aspect-video w-full rounded-xl border border-border object-cover shadow-lg", className)} />
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/50",
        className,
      )}
    >
      {videoPlaceholder ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 motion-reduce:hover:scale-100">
          <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Play video</span>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Media placeholder</span>
      )}
    </div>
  );
}
