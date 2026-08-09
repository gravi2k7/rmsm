"use client";

import Link from "next/link";
import { History, TrendingUp, TrendingDown, Gavel, ListOrdered } from "lucide-react";
import { Badge } from "@rmsm/ui";
import { WidgetCard } from "@/features/dashboard/components/widget-card";
import { useTrades } from "@/features/portfolio/hooks/use-portfolio";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { useOrders } from "@/features/execution/hooks/use-execution";
import type { Trade } from "@/features/portfolio/types";
import type { Decision } from "@/features/decisions/types";
import type { Order } from "@/features/execution/types";
import { registerDashboardWidget } from "@/lib/dashboard-widgets";

const PREVIEW_COUNT = 8;
const PER_SOURCE_COUNT = 10;

type ActivityEntry =
  | { kind: "trade"; id: string; timestamp: string; trade: Trade }
  | { kind: "decision"; id: string; timestamp: string; decision: Decision }
  | { kind: "order"; id: string; timestamp: string; order: Order };

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const DECISION_STATUS_VARIANT: Record<Decision["status"], "success" | "destructive" | "warning" | "secondary"> = {
  APPROVED: "success",
  REJECTED: "destructive",
  MANUAL_REVIEW: "warning",
  PENDING: "secondary",
};

const ORDER_STATUS_VARIANT: Record<Order["status"], "success" | "destructive" | "warning" | "secondary"> = {
  FILLED: "success",
  PARTIALLY_FILLED: "warning",
  ACCEPTED: "secondary",
  SUBMITTED: "secondary",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REJECTED: "destructive",
  EXPIRED: "destructive",
};

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const timeLabel = new Date(entry.timestamp).toLocaleString();

  if (entry.kind === "trade") {
    const { trade } = entry;
    return (
      <li className="flex items-start justify-between gap-3 border-b px-1 py-2.5 last:border-0">
        <div className="flex min-w-0 items-start gap-2">
          {trade.realizedPnl >= 0 ? (
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm">
              {trade.side} {trade.symbolCode} closed — <span className={trade.realizedPnl >= 0 ? "text-success" : "text-destructive"}>{currency(trade.realizedPnl)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{timeLabel}</p>
          </div>
        </div>
        <Badge variant={trade.isWin ? "success" : "destructive"} className="shrink-0">
          {trade.isWin ? "Win" : "Loss"}
        </Badge>
      </li>
    );
  }

  if (entry.kind === "decision") {
    const { decision } = entry;
    return (
      <li className="border-b px-1 py-2.5 last:border-0">
        <Link href={`/decisions/${decision.id}`} className="flex items-start justify-between gap-3 hover:text-foreground">
          <div className="flex min-w-0 items-start gap-2">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm">Decision — risk score {decision.riskScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{timeLabel}</p>
            </div>
          </div>
          <Badge variant={DECISION_STATUS_VARIANT[decision.status]} className="shrink-0">
            {decision.status}
          </Badge>
        </Link>
      </li>
    );
  }

  const { order } = entry;
  return (
    <li className="border-b px-1 py-2.5 last:border-0">
      <Link href={`/orders/${order.id}`} className="flex items-start justify-between gap-3 hover:text-foreground">
        <div className="flex min-w-0 items-start gap-2">
          <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm">
              {order.side} {order.quantityUnits} {order.symbolCode} — {order.type}
            </p>
            <p className="text-xs text-muted-foreground">{timeLabel}</p>
          </div>
        </div>
        <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="shrink-0">
          {order.status}
        </Badge>
      </Link>
    </li>
  );
}

/**
 * UD-001.1 Phase 3 — Recent Activity widget.
 *
 * There is no dedicated "activity feed" endpoint in this app — rather
 * than fabricate one, this merges the most recent items from three real,
 * already-fetched sources (trades, decisions, orders) into one
 * reverse-chronological list. `useTrades()`/`useDecisions()`/`useOrders()`
 * use the same query keys `app/(app)/dashboard/page.tsx` already calls
 * them with, so React Query serves this from the existing cache — no
 * duplicate network requests from adding this widget.
 */
export function RecentActivityWidget() {
  const tradesQuery = useTrades();
  const decisionsQuery = useDecisions();
  const ordersQuery = useOrders();

  const isLoading = tradesQuery.isLoading || decisionsQuery.isLoading || ordersQuery.isLoading;
  const isError = tradesQuery.isError && decisionsQuery.isError && ordersQuery.isError;

  const entries: ActivityEntry[] = [
    ...(tradesQuery.data?.items ?? []).slice(0, PER_SOURCE_COUNT).map((trade): ActivityEntry => ({ kind: "trade", id: trade.id, timestamp: trade.closedAt, trade })),
    ...(decisionsQuery.data?.items ?? [])
      .slice(0, PER_SOURCE_COUNT)
      .map((decision): ActivityEntry => ({ kind: "decision", id: decision.id, timestamp: decision.createdAt, decision })),
    ...(ordersQuery.data?.items ?? []).slice(0, PER_SOURCE_COUNT).map((order): ActivityEntry => ({ kind: "order", id: order.id, timestamp: order.createdAt, order })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, PREVIEW_COUNT);

  return (
    <WidgetCard
      title="Recent Activity"
      icon={<History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      isLoading={isLoading && entries.length === 0}
      isError={isError}
      errorMessage="Couldn't load recent activity."
      className="sm:col-span-2"
    >
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity yet.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <ActivityRow key={`${entry.kind}-${entry.id}`} entry={entry} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

registerDashboardWidget({
  id: "recent-activity",
  title: "Recent Activity",
  zone: "home",
  order: 50,
  span: 2,
  component: RecentActivityWidget,
  source: "dashboard",
});
