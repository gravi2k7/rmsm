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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Strategy Dashboard</h1>
        <Button asChild>
          <Link href="/strategies/new">
            <Plus /> New Strategy
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Active strategies" value={active.data?.pagination.totalCount} loading={active.isLoading} />
        <SummaryCard label="Archived strategies" value={archived.data?.pagination.totalCount} loading={archived.isLoading} />
        <SummaryCard label="Shown on this page" value={active.data?.data.length} loading={active.isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently created (active)</CardTitle>
        </CardHeader>
        <CardContent>
          {active.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : active.data && active.data.data.length > 0 ? (
            <ul className="divide-y">
              {active.data.data.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <Link href={`/strategies/${s.id}`} className="text-sm font-medium hover:underline">
                    {s.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.category.replace(/_/g, " ")}</span>
                    <StrategyStatusBadge status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No active strategies yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, loading }: { label: string; value: number | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>{loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-semibold">{value ?? 0}</p>}</CardContent>
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
