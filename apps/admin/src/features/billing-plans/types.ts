import type { SubscriptionPlan } from "@/features/billing-shared/types";

export type { SubscriptionPlan };

export const FEATURE_TYPES = ["BOOLEAN", "LIMIT"] as const;

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type: (typeof FEATURE_TYPES)[number];
  isEnabled: boolean;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeatureWithFeatureFlag {
  id: string;
  planId: string;
  featureFlagId: string;
  enabled: boolean;
  limit?: number | null;
  featureFlag: FeatureFlag;
}

export interface CreatePlanInput {
  key: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  trialDays?: number;
  gracePeriodDays?: number;
  isVisible?: boolean;
  displayOrder?: number;
}

export type UpdatePlanInput = Partial<Omit<CreatePlanInput, "key">>;

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  type: (typeof FEATURE_TYPES)[number];
}

export interface UpsertPlanFeatureInput {
  featureFlagId: string;
  enabled: boolean;
  limit?: number;
}
