import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src?: string;
  /** Person or company name — required even when `src` is set, since it
   * also drives the fallback initials. */
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" } as const;

/** No `Avatar` exists in `@rmsm/ui` yet — this is a small, genuinely new
 * primitive (Section 7/6: team photos, testimonial avatars), not a
 * duplicate of anything already shared. Falls back to initials when `src`
 * is omitted or fails to load, so testimonial/team content never needs a
 * placeholder image asset. */
export function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!src) {
    return (
      <span
        role="img"
        aria-label={name}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
          SIZE_CLASSES[size],
          className,
        )}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- decorative avatar image with arbitrary external/config-driven src; not worth next/image's remote-pattern config for a placeholder-era design system.
    <img
      src={src}
      alt={name}
      className={cn("shrink-0 rounded-full object-cover", SIZE_CLASSES[size], className)}
      {...props}
    />
  );
}
