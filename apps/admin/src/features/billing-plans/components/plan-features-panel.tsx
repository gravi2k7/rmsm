"use client";

import { useState } from "react";
import { Sliders } from "lucide-react";
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, Switch, Input, Label } from "@rmsm/ui";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { useFeatureFlags, usePlanFeatures, useUpsertPlanFeature } from "../hooks/use-plans";
import type { SubscriptionPlan } from "../types";

/** "Features" and "Limits" from the prompt map onto the existing
 * FeatureFlag/PlanFeature grant mechanism, not a field on the plan
 * itself — see `use-plans.ts`. Every flag defined platform-wide (Feature
 * Flag Management, Module 005) can be granted to this plan here, with an
 * optional numeric limit for LIMIT-type flags. */
export function PlanFeaturesPanel({ plan }: { plan: SubscriptionPlan }) {
  const [open, setOpen] = useState(false);
  const featureFlags = useFeatureFlags();
  const planFeatures = usePlanFeatures(open ? plan.id : undefined);
  const upsert = useUpsertPlanFeature(plan.id);

  const grantedByFlagId = new Map((planFeatures.data ?? []).map((pf) => [pf.featureFlagId, pf]));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sliders className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Features & Limits
      </Button>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{plan.name} — Features &amp; Limits</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {featureFlags.isLoading || planFeatures.isLoading ? (
            <LoadingState rows={4} />
          ) : featureFlags.error ? (
            <ErrorState error={featureFlags.error} onRetry={() => featureFlags.refetch()} />
          ) : (
            (featureFlags.data ?? []).map((flag) => {
              const grant = grantedByFlagId.get(flag.id);
              const enabled = grant?.enabled ?? false;
              return (
                <div key={flag.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{flag.name}</p>
                      <p className="text-xs text-muted-foreground">{flag.key}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => upsert.mutate({ featureFlagId: flag.id, enabled: v, limit: grant?.limit ?? undefined })}
                    />
                  </div>
                  {enabled && flag.type === "LIMIT" && (
                    <div className="mt-3 space-y-1">
                      <Label htmlFor={`limit-${flag.id}`} className="text-xs">
                        Limit (blank = unlimited)
                      </Label>
                      <Input
                        id={`limit-${flag.id}`}
                        type="number"
                        min={0}
                        defaultValue={grant?.limit ?? undefined}
                        onBlur={(e) =>
                          upsert.mutate({
                            featureFlagId: flag.id,
                            enabled: true,
                            limit: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
