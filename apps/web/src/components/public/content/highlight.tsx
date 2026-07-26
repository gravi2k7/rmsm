import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HighlightProps {
  children: ReactNode;
  className?: string;
}

/** Inline emphasis for a word/phrase within a larger heading or paragraph
 * (e.g. "Built for <Highlight>institutional</Highlight> trading desks"). */
export function Highlight({ children, className }: HighlightProps) {
  return <mark className={cn("rounded bg-transparent bg-gradient-to-t from-primary/20 to-transparent px-0.5 text-foreground", className)}>{children}</mark>;
}
