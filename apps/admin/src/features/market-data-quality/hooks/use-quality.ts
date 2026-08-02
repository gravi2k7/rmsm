import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QualitySummary } from "@/features/market-data-shared/types";

/** The only endpoint `QualityController` exposes — average quality/
 * confidence scores plus issue counts grouped by STATUS (not by issue
 * type). There is no endpoint that breaks issues down by type (missing
 * bar / duplicate / outlier / bad OHLC / volume error) or lists raw
 * issues — `DataQualityIssueRepository` has the methods, but
 * `QualityController` never exposes them over HTTP. Documented, not
 * routed around, since this milestone cannot add endpoints. */
export function useQualitySummary() {
  return useQuery({
    queryKey: ["market-data", "quality", "summary"],
    queryFn: () => api.get<QualitySummary>("/market-data/quality/summary"),
    refetchInterval: 30_000,
  });
}
