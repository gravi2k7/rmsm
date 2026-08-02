import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { DATA_GAP_STATUSES } from "@/features/market-data-shared/types";
import type { DataGap } from "@/features/market-data-shared/types";

const GAPS_KEY = ["market-data", "gaps"] as const;

export function useGaps(status: string) {
  return useQuery({
    queryKey: [...GAPS_KEY, status],
    queryFn: () => api.get<DataGap[]>(`/market-data/gaps?status=${status}`),
  });
}

/** "Statistics" (the prompt's requirement) has no dedicated backend
 * endpoint — `GapController` only supports listing by a single status at
 * a time. This fans out over the fixed, known set of gap statuses (not
 * a variable-length list, so a plain `useQueries` over a constant array,
 * unlike the org-fan-out pattern in the Billing pages) to build a real
 * status-count breakdown from genuine data. */
export function useGapStatistics() {
  const results = useQueries({
    queries: DATA_GAP_STATUSES.map((status) => ({
      queryKey: [...GAPS_KEY, "stats", status],
      queryFn: () => api.get<DataGap[]>(`/market-data/gaps?status=${status}`),
    })),
  });
  const counts: Record<string, number> = {};
  DATA_GAP_STATUSES.forEach((status, i) => {
    counts[status] = results[i]?.data?.length ?? 0;
  });
  return { counts, isLoading: results.some((r) => r.isLoading) };
}

export interface DetectGapsInput {
  instrumentId: string;
  interval: string;
  from: string;
  to: string;
  respectWeekends?: boolean;
}

export function useDetectGaps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DetectGapsInput) => api.post<DataGap[]>("/market-data/gaps/detect", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GAPS_KEY }),
  });
}

/** There is no "ignore gap" endpoint — `GapController` exposes list,
 * detect, and repair only. The prompt's "Ignore" action has no backing
 * API and is not implemented as a fake local-only toggle. */
export function useRepairGap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<DataGap>(`/market-data/gaps/${id}/repair`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GAPS_KEY }),
  });
}
