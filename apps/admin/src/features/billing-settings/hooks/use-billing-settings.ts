"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PlatformSetting } from "@/features/billing-shared/types";

const SETTINGS_KEY = ["admin", "configuration", "billing"] as const;

/** `admin/configuration` (Module 005's generic `PlatformSetting`
 * key-value store) is the only settings-persistence mechanism this API
 * exposes — there is no billing-specific settings endpoint. Every field
 * on this page is one `PlatformSetting` row under the "billing"
 * category, matched by a fixed, documented key. */
export function useBillingSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.get<PlatformSetting[]>("/admin/configuration?category=billing"),
  });
}

export function useUpsertBillingSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; value: unknown; description?: string }) =>
      api.put<PlatformSetting>("/admin/configuration", { ...input, category: "billing" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
