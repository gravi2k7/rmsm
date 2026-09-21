"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@rmsm/ui";
import { SessionGate } from "@/components/ui-extra/session-gate";
import { useStrategies } from "@/hooks/use-strategies";
import { StrategyStatusBadge } from "@/components/strategy/status-badges";

function DashboardContent() {
  const active = useStrategies({ status: "ACTIVE", pageSize: 5, page: 1 });
  const archived = useStrategies({ status: "ARCHIVED", pageSize: 1, page: 1 });

  return (
    <div className="rmsm-mobile-glass-page w-full min-w-0 space-y-4 overflow-x-hidden pb-8 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Strategy Dashboard</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/strategies/new">
            <Plus /> New Strategy
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <SummaryCard
          label="Active strategies"
          value={active.data?.pagination.totalCount}
          loading={active.isLoading}
        />
        <SummaryCard
          label="Archived strategies"
          value={archived.data?.pagination.totalCount}
          loading={archived.isLoading}
        />
        <SummaryCard
          label="Shown on this page"
          value={active.data?.data.length}
          loading={active.isLoading}
        />
      </div>

      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base">Recently created (active)</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          {active.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : active.data && active.data.data.length > 0 ? (
            <ul className="divide-y">
              {active.data.data.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/strategies/${s.id}`}
                    className="min-w-0 truncate text-sm font-medium hover:underline"
                  >
                    {s.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {s.category.replace(/_/g, " ")}
                    </span>
                    <StrategyStatusBadge status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No active strategies yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-muted-foreground text-xs font-medium sm:text-sm">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold sm:text-3xl">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StrategyDashboardPage() {
  return (
    <SessionGate>
      <DashboardContent />
    </SessionGate>
  );
}
