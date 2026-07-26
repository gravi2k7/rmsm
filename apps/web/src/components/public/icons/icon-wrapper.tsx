import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconVariant = "default" | "muted" | "primary" | "outline" | "filled";
export type IconSize = "sm" | "md" | "lg" | "xl";

interface IconWrapperProps {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  /** Applies a hover color/scale transition — only meaningful when the
   * wrapper sits inside an interactive ancestor (a link/button). */
  hover?: boolean;
  className?: string;
  label?: string;
}

const SIZE_CLASSES: Record<IconSize, string> = {
  sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
  xl: "h-16 w-16 [&_svg]:h-8 [&_svg]:w-8",
};

const VARIANT_CLASSES: Record<IconVariant, string> = {
  default: "text-foreground",
  muted: "bg-muted text-muted-foreground rounded-lg",
  primary: "bg-primary text-primary-foreground rounded-lg",
  outline: "border border-border text-foreground rounded-lg",
  filled: "bg-accent text-accent-foreground rounded-lg",
};

/**
 * Reusable icon wrapper (Section 16) — every card/feature/AI/step component
 * in this design system renders its icon through this rather than styling
 * `lucide-react` icons ad hoc, so size/variant/theme stay consistent
 * platform-wide. `theme` support comes for free: every variant is built
 * from the semantic tokens wired up in WM-002R (`bg-muted`, `bg-primary`,
 * ...), which already flip correctly between light/dark via `globals.css`.
 */
export function IconWrapper({ icon: Icon, size = "md", variant = "default", hover = false, className, label }: IconWrapperProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors motion-reduce:transition-none",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        hover && "group-hover:scale-110 group-hover:text-primary motion-reduce:group-hover:scale-100",
        className,
      )}
    >
      <Icon aria-hidden={label ? undefined : "true"} aria-label={label} />
    </span>
  );
}
