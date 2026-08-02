import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ImportJob, ValidationReport } from "@/features/market-data-shared/types";

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

export function useImportHistory(providerId: string | undefined) {
  return useQuery({
    queryKey: [...JOBS_KEY, "history", providerId],
    queryFn: () => api.get<ImportJob[]>(`/market-data/import-jobs/history?providerId=${providerId}`),
    enabled: !!providerId,
  });
}

export function useImportStatistics() {
  return useQuery({
    queryKey: [...JOBS_KEY, "statistics"],
    queryFn: () => api.get<Record<string, number>>("/market-data/import-jobs/statistics"),
  });
}

export function useValidationReport(jobId: string | undefined) {
  return useQuery({
    queryKey: [...JOBS_KEY, jobId, "validation-report"],
    queryFn: () => api.get<ValidationReport>(`/market-data/import-jobs/${jobId}/validation-report`),
    enabled: !!jobId,
  });
}

export interface ScheduleImportInput {
  instrumentId: string;
  providerConfigId: string;
  interval: string;
  from: string;
  to: string;
  isIncremental?: boolean;
  priority?: number;
  scheduledFor?: string;
}

export function useScheduleImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleImportInput) => api.post<ImportJob>("/market-data/import-jobs", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
}

export function useResumeImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ resumed: boolean }>(`/market-data/import-jobs/${id}/resume`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
}

export function useRetryImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ImportJob>(`/market-data/import-jobs/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
}
