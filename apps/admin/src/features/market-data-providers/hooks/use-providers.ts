import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ProviderConfig, ProviderDiagnostics, ConnectionTestResult, CredentialStatus } from "@/features/market-data-shared/types";

const PROVIDERS_KEY = ["market-data", "providers"] as const;
const DIAGNOSTICS_KEY = ["market-data", "providers", "diagnostics"] as const;

export function useProviders() {
  return useQuery({ queryKey: PROVIDERS_KEY, queryFn: () => api.get<ProviderConfig[]>("/market-data/providers") });
}

/** The combined registry/circuit-breaker/credential view — online/offline
 * status for the Dashboard and Provider Health pages comes from here,
 * not from `ProviderConfig.isActive` alone (a provider can be
 * `isActive: true` in config yet unregistered or circuit-open live). */
export function useProviderDiagnostics() {
  return useQuery({ queryKey: DIAGNOSTICS_KEY, queryFn: () => api.get<ProviderDiagnostics[]>("/market-data/providers/diagnostics") });
}

export function useUpdateProviderPriority(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (priority: number) => api.patch<ProviderConfig>(`/market-data/providers/${id}/priority`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY });
      queryClient.invalidateQueries({ queryKey: DIAGNOSTICS_KEY });
    },
  });
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ConnectionTestResult>(`/market-data/providers/${id}/test-connection`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY });
      queryClient.invalidateQueries({ queryKey: DIAGNOSTICS_KEY });
    },
  });
}

export function useCredentialStatus(type: string | undefined) {
  return useQuery({
    queryKey: ["market-data", "providers", "credentials", type],
    queryFn: () => api.get<CredentialStatus>(`/market-data/providers/credentials/${type}/status`),
    enabled: !!type,
  });
}
