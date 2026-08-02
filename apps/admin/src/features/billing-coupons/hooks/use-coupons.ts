import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Coupon } from "@/features/billing-shared/types";

const COUPONS_KEY = ["billing", "admin", "coupons"] as const;

export interface CreateCouponInput {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  currency?: string;
  expiresAt?: string;
  maxRedemptions?: number;
  organizationId?: string;
  isPublic?: boolean;
}

export function useCoupons() {
  return useQuery({ queryKey: COUPONS_KEY, queryFn: () => api.get<Coupon[]>("/billing/admin/coupons") });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCouponInput) => api.post<Coupon>("/billing/admin/coupons", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY }),
  });
}

/** No delete/update endpoint exists for coupons — `deactivate` (setting
 * `isActive: false`) is the only lifecycle action the API exposes beyond
 * create, so it stands in for both "Edit status" and "Delete" here. */
export function useDeactivateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Coupon>(`/billing/admin/coupons/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY }),
  });
}
