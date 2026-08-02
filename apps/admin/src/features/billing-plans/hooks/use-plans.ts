import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  SubscriptionPlan,
  FeatureFlag,
  PlanFeatureWithFeatureFlag,
  CreatePlanInput,
  UpdatePlanInput,
  CreateFeatureFlagInput,
  UpsertPlanFeatureInput,
} from "../types";

const PLANS_KEY = ["billing", "admin", "plans"] as const;
const FEATURES_KEY = ["billing", "admin", "features"] as const;

export function usePlans() {
  return useQuery({ queryKey: PLANS_KEY, queryFn: () => api.get<SubscriptionPlan[]>("/billing/admin/plans") });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => api.post<SubscriptionPlan>("/billing/admin/plans", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** The API's own update route is `POST /billing/admin/plans/:planId` (not
 * PATCH/PUT) — matched exactly rather than "corrected" to a RESTful verb. */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePlanInput) => api.post<SubscriptionPlan>(`/billing/admin/plans/${planId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** There is no delete endpoint for plans (`SubscriptionPlanRepository`
 * exposes create/update only). "Archive" is implemented as the only
 * honest equivalent reachable through the existing API: hiding the plan
 * from customers via `isVisible: false`. See the plans page UI copy. */
export function useArchivePlan(planId: string) {
  return useUpdatePlan(planId);
}

export function useFeatureFlags() {
  return useQuery({ queryKey: FEATURES_KEY, queryFn: () => api.get<FeatureFlag[]>("/billing/admin/features") });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeatureFlagInput) => api.post<FeatureFlag>("/billing/admin/features", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEATURES_KEY }),
  });
}

export function usePlanFeatures(planId: string | undefined) {
  return useQuery({
    queryKey: [...PLANS_KEY, planId, "features"],
    queryFn: () => api.get<PlanFeatureWithFeatureFlag[]>(`/billing/admin/plans/${planId}/features`),
    enabled: !!planId,
  });
}

export function useUpsertPlanFeature(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertPlanFeatureInput) => api.post(`/billing/admin/plans/${planId}/features`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...PLANS_KEY, planId, "features"] }),
  });
}

export function useRemovePlanFeature(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureFlagId: string) => api.delete(`/billing/admin/plans/${planId}/features/${featureFlagId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...PLANS_KEY, planId, "features"] }),
  });
}
