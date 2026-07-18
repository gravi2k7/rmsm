import * as React from "react";
import { cn } from "../utils";

/** Screen-reader-only content — visible to assistive tech, not sighted users. */
export function VisuallyHidden({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("sr-only", className)} {...props} />;
}

/** Skip-to-main-content link — hidden until keyboard-focused, per WCAG 2.4.1. */
export function SkipLink({ href = "#main-content" }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}
