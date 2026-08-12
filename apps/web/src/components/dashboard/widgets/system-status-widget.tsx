"use client";

import { HeartPulse, Bell } from "lucide-react";
import { Badge, Skeleton } from "@rmsm/ui";
import { WidgetCard } from "@/features/dashboard/components/widget-card";
import { useApiHealth } from "@/features/dashboard/hooks/use-health";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useRequestContext } from "@/hooks/use-request-context";
import { registerDashboardWidget } from "@/lib/dashboard-widgets";

function formatCheckName(name: string): string {
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * UD-001.1 Phase 3 — System Status widget.
 *
 * Extracted from the inline "System" `WidgetCard` that used to live
 * directly in `app/(app)/dashboard/page.tsx` — same API Health/System
 * Ready badges, same `useApiHealth()` hook, unchanged. Two real
 * enhancements over that original version:
 *
 *  1. The "Notifications — coming soon" row is replaced with a real
 *     unread count from `useNotifications()` (that data didn't exist
 *     on the dashboard when the original widget was written; it does
 *     now, via the same hook `NotificationCenter` uses).
 *  2. `useApiHealth()` already returns a per-check `checks` breakdown
 *     (`Record<string, "ok" | "error">` from `/health/ready`) that the
 *     original widget fetched but never rendered — surfaced here as a
 *     compact pass/fail list instead of collapsing it into just the one
 *     top-level "System Ready" badge.
 */
export function SystemStatusWidget() {
  const health = useApiHealth();
  const ctx = useRequestContext();
  const notificationsQuery = useNotifications();
  const unreadCount = ctx
  ? (notificationsQuery.data?.items?.filter(
      (n) => n.readAt === null && n.archivedAt === null,
    ).length ?? 0)
  : undefined;

  const checkEntries = health.checks ? Object.entries(health.checks) : [];

  return (
    <WidgetCard title="System Status" icon={<HeartPulse className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} isLoading={health.isLoading}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>API Health</span>
          <Badge variant={health.apiHealthy ? "success" : "destructive"}>{health.apiHealthy ? "Healthy" : "Degraded"}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>System Ready</span>
          <Badge variant={health.systemReady ? "success" : "destructive"}>{health.systemReady ? "Ready" : "Not ready"}</Badge>
        </div>

        {checkEntries.length > 0 && (
          <div className="space-y-1.5 border-t pt-2">
            {checkEntries.map(([name, status]) => (
              <div key={name} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCheckName(name)}</span>
                <Badge variant={status === "ok" ? "success" : "destructive"} className="text-[10px]">
                  {status === "ok" ? "OK" : "Error"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-2 text-sm">
          <span className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            Notifications
          </span>
          {!ctx ? (
            <Badge variant="outline">No session</Badge>
          ) : notificationsQuery.isLoading ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            <Badge variant={unreadCount && unreadCount > 0 ? "warning" : "secondary"}>{unreadCount ?? 0} unread</Badge>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}

registerDashboardWidget({
  id: "system-status",
  title: "System Status",
  zone: "home",
  order: 30,
  component: SystemStatusWidget,
  source: "dashboard",
});
