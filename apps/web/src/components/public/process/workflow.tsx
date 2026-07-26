import { cn } from "@/lib/utils";
import { Connector } from "./connector";
import { StepCard, type StepCardProps } from "./step-card";

interface WorkflowProps {
  steps: Omit<StepCardProps, "step">[];
  className?: string;
}

/** Arranges `StepCard`s with `Connector`s between them — horizontal on
 * larger screens, stacked on mobile (Section 18: responsive). */
export function Workflow({ steps, className }: WorkflowProps) {
  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-start", className)}>
      {steps.map((step, i) => (
        <div key={step.title} className="flex flex-1 items-start gap-4 lg:contents">
          <StepCard step={i + 1} {...step} />
          {i < steps.length - 1 ? (
            <div className="hidden pt-4 lg:block lg:flex-1">
              <Connector />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
