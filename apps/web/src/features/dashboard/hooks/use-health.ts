import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface HealthSummary {
  status: string;
}

interface ReadinessSummary {
  status: string;
  checks: Record<string, "ok" | "error">;
}

export function useApiHealth() {
  const health = useQuery({
    queryKey: ["dashboard", "health"],
    queryFn: () => api.get<HealthSummary>("/health", { skipAuth: true }),
    refetchInterval: 30_000,
  });
  const readiness = useQuery({
    queryKey: ["dashboard", "readiness"],
    queryFn: () => api.get<ReadinessSummary>("/health/ready", { skipAuth: true }),
    refetchInterval: 30_000,
  });

  return {
    isLoading: health.isLoading || readiness.isLoading,
    isError: health.isError || readiness.isError,
    apiHealthy: health.data?.status === "ok",
    systemReady: readiness.data?.status === "ok",
    checks: readiness.data?.checks,
  };
}
