"use client";

import { MoreHorizontal } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  toast,
} from "@rmsm/ui";
import { usePlans } from "@/features/billing-plans/hooks/use-plans";
import { useChangeSubscriptionPlan, useCancelSubscription } from "../hooks/use-customer-subscriptions";
import { ApiError } from "@/lib/api-client";
import type { OrganizationSubscriptionWithPlan } from "@/features/billing-shared/types";

export function SubscriptionActionsMenu({ organizationId, subscription }: { organizationId: string; subscription: OrganizationSubscriptionWithPlan }) {
  const plans = usePlans();
  const changePlan = useChangeSubscriptionPlan(organizationId);
  const cancelSubscription = useCancelSubscription(organizationId);

  async function handleChangePlan(planKey: string) {
    try {
      await changePlan.mutateAsync(planKey);
      toast.success(`Plan changed to ${planKey}.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to change plan.");
    }
  }

  async function handleCancel() {
    try {
      await cancelSubscription.mutateAsync();
      toast.success("Subscription cancelled.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to cancel subscription.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(plans.data ?? [])
          .filter((p) => p.key !== subscription.plan.key)
          .map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => handleChangePlan(p.key)}>
              Move to {p.name}
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={handleCancel}>
          Cancel Subscription
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
