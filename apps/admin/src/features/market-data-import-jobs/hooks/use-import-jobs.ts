import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ImportJob } from "@/features/market-data-shared/types";

const JOBS_KEY = ["market-data", "import-jobs"] as const;

/** `market-data/synchronizations/import-jobs` — the read-only reporting
 * surface (`SynchronizationController`), defaults to RUNNING when no
 * status is given, per that endpoint's own documented default. */
export function useImportJobsByStatus(status: string | undefined) {
  return useQuery({
    queryKey: [...JOBS_KEY, "by-status", status],
    queryFn: () => api.get<ImportJob[]>(`/market-data/synchronizations/import-jobs${status ? `?status=${status}` : ""}`),
    refetchInterval: 15_000,
  });
}

export function useImportJob(id: string | undefined) {
  return useQuery({
    queryKey: [...JOBS_KEY, id],
    queryFn: () => api.get<ImportJob>(`/market-data/synchronizations/import-jobs/${id}`),
    enabled: !!id,
  });
}

export interface ImportHistoricalCandlesInput {
  instrumentId: string;
  providerConfigId: string;
  interval: string;
  from: string;
  to: string;
}

export function useImportHistoricalCandles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ImportHistoricalCandlesInput) =>
      api.post<ImportJob>("/market-data/synchronizations/import", input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
}
