"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { api } from "@/lib/api-client";

interface Liveness {
  status: string;
  timestamp: string;
}

interface Readiness {
  status: string;
  checks: Record<string, "ok" | "error">;
  timestamp: string;
}

function useLiveness() {
  return useQuery({ queryKey: ["health", "liveness"], queryFn: () => api.get<Liveness>("/health", { skipAuth: true }), refetchInterval: 10_000 });
}

function useReadiness() {
  return useQuery({ queryKey: ["health", "readiness"], queryFn: () => api.get<Readiness>("/health/ready", { skipAuth: true }), refetchInterval: 10_000 });
}

export default function HealthPage() {
  const liveness = useLiveness();
  const readiness = useReadiness();

  const isLoading = liveness.isLoading || readiness.isLoading;
  const error = liveness.error ?? readiness.error;

  function refetchAll() {
    liveness.refetch();
    readiness.refetch();
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetchAll} />;

  return (
    <div>
      <PageHeader
        title="Health Monitoring"
        description="Live liveness/readiness checks against the API."
        actions={
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="API Status"
          value={liveness.data?.status === "ok" ? "Online" : "Offline"}
          icon={Activity}
          trendDirection={liveness.data?.status === "ok" ? "up" : "down"}
        />
        <StatCard
          label="System Status"
          value={readiness.data?.status === "ok" ? "Healthy" : "Degraded"}
          icon={Activity}
          trendDirection={readiness.data?.status === "ok" ? "up" : "down"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dependency Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {readiness.data &&
            Object.entries(readiness.data.checks).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm capitalize">{name}</span>
                <Badge variant={status === "ok" ? "success" : "destructive"}>{status === "ok" ? "Healthy" : "Error"}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">Last checked: {readiness.data ? new Date(readiness.data.timestamp).toLocaleString() : "—"}</p>
    </div>
  );
}
