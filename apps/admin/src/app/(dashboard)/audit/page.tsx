"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useLoginHistory, useActiveSessions } from "@/features/audit/hooks/use-audit";
import type { LoginHistoryEntry, Session } from "@/features/audit/types";

const loginHistoryColumns: ColumnDef<LoginHistoryEntry, unknown>[] = [
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "success",
    header: "Result",
    cell: ({ row }) => <Badge variant={row.original.success ? "success" : "destructive"}>{row.original.success ? "Success" : "Failed"}</Badge>,
  },
  { accessorKey: "reason", header: "Reason", cell: ({ row }) => row.original.reason ?? "—" },
  { accessorKey: "ipAddress", header: "IP Address", cell: ({ row }) => row.original.ipAddress ?? "—" },
  { accessorKey: "createdAt", header: "When", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
];

const sessionColumns: ColumnDef<Session, unknown>[] = [
  { accessorKey: "deviceLabel", header: "Device", cell: ({ row }) => row.original.deviceLabel ?? "Unknown device" },
  { accessorKey: "ipAddress", header: "IP Address", cell: ({ row }) => row.original.ipAddress ?? "—" },
  { accessorKey: "lastSeenAt", header: "Last Seen", cell: ({ row }) => new Date(row.original.lastSeenAt).toLocaleString() },
  { accessorKey: "expiresAt", header: "Expires", cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString() },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.revokedAt ? "destructive" : "success"}>{row.original.revokedAt ? "Revoked" : "Active"}</Badge>,
  },
];

export default function AuditPage() {
  const loginHistory = useLoginHistory();
  const activeSessions = useActiveSessions();

  return (
    <div>
      <PageHeader title="Audit Logs" description="Your own account's login history and active sessions." />

      <p className="mb-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        The platform does not yet expose a platform-wide activity/security-events log over the API — only each account&apos;s own login history and
        session list. This page shows real data for the signed-in admin account; a cross-organization audit trail would need a new endpoint, which is
        out of this phase&apos;s own &quot;consume the existing REST API only&quot; scope.
      </p>

      <Tabs defaultValue="login-history">
        <TabsList>
          <TabsTrigger value="login-history">Login History</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="login-history" className="mt-4">
          <DataTable
            columns={loginHistoryColumns}
            data={loginHistory.data?.data}
            isLoading={loginHistory.isLoading}
            error={loginHistory.error}
            onRetry={() => loginHistory.refetch()}
            emptyTitle="No login history yet"
          />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <DataTable
            columns={sessionColumns}
            data={activeSessions.data}
            isLoading={activeSessions.isLoading}
            error={activeSessions.error}
            onRetry={() => activeSessions.refetch()}
            emptyTitle="No active sessions"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
