"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PlatformSetting } from "@/features/market-data-shared/types";

const SETTINGS_KEY = ["admin", "configuration", "market-data"] as const;

/** Same generic `PlatformSetting` store Milestone A's Billing Settings
 * page used (`admin/configuration`) — the only settings-persistence
 * mechanism this API has. Every field here is one row under the
 * "market-data" category. */
export function useMarketDataSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.get<PlatformSetting[]>("/admin/configuration?category=market-data"),
  });
}

export function useUpsertMarketDataSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; value: unknown; description?: string }) =>
      api.put<PlatformSetting>("/admin/configuration", { ...input, category: "market-data" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
