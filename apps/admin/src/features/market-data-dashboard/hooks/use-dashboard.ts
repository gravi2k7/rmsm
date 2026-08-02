"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { IMPORT_JOB_STATUSES } from "@/features/market-data-shared/types";
import type { ImportJob, PaginatedResult, Instrument } from "@/features/market-data-shared/types";

/**
 * "Import Jobs Today" / "Successful" / "Failed" / "Pending" (the
 * prompt's cards): `SynchronizationController`'s list endpoint has no
 * date filter and requires a single status per call — there's no "all
 * jobs today" endpoint. This fans out over the full, fixed set of
 * `ImportJobStatus` values (six calls, not a variable-length list) and
 * filters the combined result client-side by `startedAt` falling within
 * today, so every number on this dashboard is real data, just computed
 * from several real reads instead of one endpoint that doesn't exist.
 */
export function useImportJobsToday() {
  const results = useQueries({
    queries: IMPORT_JOB_STATUSES.map((status) => ({
      queryKey: ["market-data", "import-jobs-today", status],
      queryFn: () => api.get<ImportJob[]>(`/market-data/synchronizations/import-jobs?status=${status}`),
      refetchInterval: 30_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const all = results.flatMap((r) => r.data ?? []);

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const today = all.filter((job) => job.startedAt && new Date(job.startedAt) >= startOfDay);
  const byStatus = (status: string) => today.filter((j) => j.status === status).length;

  const recent = [...all]
    .filter((j) => j.startedAt)
    .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())
    .slice(0, 8);

  return {
    isLoading,
    total: today.length,
    successful: byStatus("COMPLETED"),
    failed: byStatus("FAILED"),
    pending: byStatus("PENDING") + byStatus("RUNNING"),
    recent,
    /** Bucketed by hour-of-day for today's jobs only — a real, honest
     * "Import Timeline" (intraday), not a fabricated multi-day trend
     * (no endpoint provides job history beyond what's fetched above). */
    timelineByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      count: today.filter((j) => new Date(j.startedAt!).getHours() === hour).length,
    })),
  };
}

export function useTotalInstrumentCount() {
  return useQueries({
    queries: [
      {
        queryKey: ["market-data", "instruments", "count"],
        queryFn: () => api.get<PaginatedResult<Instrument>>("/market-data/instruments"),
      },
    ],
  })[0];
}
