import { Check } from "lucide-react";
import { cn } from "@rmsm/ui";

export interface StepperProps {
  steps: string[];
  currentStep: number;
}

/** A minimal, local stepper — @rmsm/ui has no Stepper component, and one
 * generic enough to add there isn't warranted for the single wizard that
 * needs it (Historical Import). Built once here, not duplicated. */
export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((label, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <li key={label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent && !isComplete && "border-2 border-primary text-primary",
                  !isComplete && !isCurrent && "border text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("text-sm", isCurrent ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn("mx-3 h-px flex-1", isComplete ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
