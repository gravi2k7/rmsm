import { cn } from "@/lib/utils";

interface ConnectorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/** Plain connecting line between `StepCard`s — its own component per
 * Section 9, rather than inlined in `Workflow`, so a page composing steps
 * manually can still get a matching connector. */
export function Connector({ orientation = "horizontal", className }: ConnectorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(orientation === "horizontal" ? "h-0.5 flex-1 bg-border" : "w-0.5 flex-1 bg-border", className)}
    />
  );
}
