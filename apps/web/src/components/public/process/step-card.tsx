import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/public/icons";

export interface StepCardProps {
  step: number;
  icon?: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function StepCard({ step, icon, title, description, className }: StepCardProps) {
  return (
    <div className={cn("flex flex-1 flex-col items-start gap-3 text-left", className)}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {step}
        </span>
        {icon ? <IconWrapper icon={icon} variant="muted" /> : null}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
