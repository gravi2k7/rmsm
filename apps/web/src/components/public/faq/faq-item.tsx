import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItemProps {
  question: string;
  answer: string;
  /** Renders open on first paint. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Single FAQ entry (Section 11). Built on the native `<details>`/`<summary>`
 * elements rather than a custom-JS accordion or a new Radix dependency
 * (`@rmsm/ui` has no accordion primitive, and none is installed anywhere in
 * the workspace) — `<details>` gives real keyboard support (Enter/Space
 * toggles, natively focusable) and correct semantics/ARIA exposure in every
 * browser and screen reader for free, which is exactly what Section 11 asks
 * for ("Keyboard support", "ARIA").
 */
export function FAQItem({ question, answer, defaultOpen = false, className }: FAQItemProps) {
  return (
    <details
      open={defaultOpen}
      className={cn("group border-b border-border py-4 first:pt-0 last:border-0", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium marker:content-none [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">{answer}</p>
    </details>
  );
}
