import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RichTextProps {
  children: ReactNode;
  className?: string;
}

/**
 * Prose wrapper for longer-form marketing/content copy (e.g. a company
 * story, a blog body once that milestone exists). Renders whatever
 * markup/children the page passes in — no markdown parsing here, that's a
 * later milestone's concern if it's ever needed. Uses the same
 * `--font-sans`/color tokens as everything else, so nested `h2`/`p`/`ul`
 * automatically match the rest of the design system without a `@tailwindcss/typography` dependency.
 */
export function RichText({ children, className }: RichTextProps) {
  return (
    <div
      className={cn(
        "max-w-none space-y-4 text-foreground",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold",
        "[&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
