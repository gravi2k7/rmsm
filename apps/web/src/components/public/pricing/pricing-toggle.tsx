"use client";

import { Switch } from "@rmsm/ui";
import { cn } from "@/lib/utils";

interface PricingToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  offLabel?: string;
  onLabel?: string;
  /** Presentational only, e.g. "Save 20%" — no discount math happens here
   * ("No pricing logic" per Section 10). */
  badge?: string;
  className?: string;
}

/** Billing-period toggle built on `@rmsm/ui`'s `Switch` — fully controlled,
 * no internal state and no price calculation. The page/consumer owns what
 * "checked" means (e.g. annual vs. monthly) and what prices to render. */
export function PricingToggle({ checked, onCheckedChange, offLabel = "Monthly", onLabel = "Annual", badge, className }: PricingToggleProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <span className={cn("text-sm", !checked && "font-semibold text-foreground", checked && "text-muted-foreground")}>{offLabel}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={`Toggle between ${offLabel} and ${onLabel} pricing`} />
      <span className={cn("text-sm", checked && "font-semibold text-foreground", !checked && "text-muted-foreground")}>{onLabel}</span>
      {badge ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{badge}</span> : null}
    </div>
  );
}
