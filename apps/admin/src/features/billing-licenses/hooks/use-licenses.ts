import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { License, PaginatedResult, IssueLicenseInput, AssignLicenseInput } from "../types";

const LICENSES_KEY = ["admin", "licenses"] as const;

/** `admin/licenses` — platform-wide, no organization-role guard (Domain
 * 1's own License Management surface; `billing/licenses` is an
 * equivalent read-only alternative also mounted for the billing surface,
 * see `license-billing.controller.ts`'s doc comment). */
export function useLicenses() {
  return useQuery({ queryKey: LICENSES_KEY, queryFn: () => api.get<PaginatedResult<License>>("/admin/licenses?pageSize=500") });
}

export function useIssueLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueLicenseInput) => api.post<License>("/admin/licenses", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LICENSES_KEY }),
  });
}

export function useAssignLicense(licenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignLicenseInput) => api.post<License>(`/admin/licenses/${licenseId}/assign`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LICENSES_KEY }),
  });
}

export function useRevokeLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (licenseId: string) => api.post<License>(`/admin/licenses/${licenseId}/revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LICENSES_KEY }),
  });
}
