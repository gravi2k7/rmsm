import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AiReadinessSnapshot } from "@/features/market-data-shared/types";

export interface GenerateAiReadinessInput {
  instrumentId: string;
  interval: string;
}

/** `AiReadinessController` computes one snapshot (trend/volatility/
 * liquidity/confidence/session/spread/regime/anomaly flags) per
 * instrument/interval — there is no platform-wide "coverage across all
 * instruments" aggregate endpoint, so "Coverage"/"Completeness" (the
 * prompt's requirements) are shown per-instrument from real snapshot
 * data, not as a fabricated platform-wide percentage. */
export function useGenerateAiReadiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateAiReadinessInput) => api.post<AiReadinessSnapshot>("/market-data/ai-readiness/generate", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["market-data", "ai-readiness"] }),
  });
}

export function useLatestAiReadiness(instrumentId: string | undefined, interval: string | undefined) {
  return useQuery({
    queryKey: ["market-data", "ai-readiness", instrumentId, interval],
    queryFn: () => api.get<AiReadinessSnapshot>(`/market-data/ai-readiness/${instrumentId}/${interval}/latest`),
    enabled: !!instrumentId && !!interval,
  });
}
