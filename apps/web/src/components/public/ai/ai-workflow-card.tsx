import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

export interface AIWorkflowStep {
  label: string;
  icon?: LucideIcon;
}

export interface AIWorkflowCardProps {
  title: string;
  description?: string;
  steps: AIWorkflowStep[];
  className?: string;
}

/** Depicts an AI workflow as a horizontal step chain (e.g. "Ingest → Score
 * → Decide → Notify"). Purely presentational — no orchestration/business
 * logic, matching every other component in this milestone. */
export function AIWorkflowCard({ title, description, steps, className }: AIWorkflowCardProps) {
  return (
    <div className={cn("rounded-xl border border-border p-6", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}

      <ol className="mt-5 flex flex-wrap items-center gap-2">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm">
              {step.icon ? <IconWrapper icon={step.icon} size="sm" variant="default" /> : null}
              {step.label}
            </span>
            {i < steps.length - 1 ? <span className="text-muted-foreground" aria-hidden="true">→</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
