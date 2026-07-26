import { cn } from "@/lib/utils";

export interface NumberedStepItem {
  title: string;
  description?: string;
}

interface NumberedStepsProps {
  steps: NumberedStepItem[];
  className?: string;
}

/** Simpler, list-shaped alternative to `Workflow`/`StepCard` — a numbered
 * list rather than a card row, for denser step-by-step copy (e.g. "How to
 * get started" in three short lines). */
export function NumberedSteps({ steps, className }: NumberedStepsProps) {
  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">{i + 1}</span>
          <div>
            <p className="text-sm font-medium">{step.title}</p>
            {step.description ? <p className="text-sm text-muted-foreground">{step.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
