"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useOrders, useExecutions } from "@/features/execution/hooks/use-execution";
import { CreateOrderDialog } from "@/features/execution/components/create-order-dialog";
import type { Order, Execution } from "@/features/execution/types";

const orderColumns: ColumnDef<Order, unknown>[] = [
  { accessorKey: "symbolCode", header: "Symbol" },
  { accessorKey: "side", header: "Side", cell: ({ row }) => <Badge variant={row.original.side === "BUY" ? "success" : "destructive"}>{row.original.side}</Badge> },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "quantityUnits", header: "Quantity", cell: ({ row }) => row.original.quantityUnits.toLocaleString() },
  {
    id: "fill",
    header: "Fill",
    cell: ({ row }) => `${row.original.filledQuantityUnits.toLocaleString()} / ${row.original.quantityUnits.toLocaleString()}`,
  },
  {
    accessorKey: "averageFillPrice",
    header: "Avg Fill Price",
    cell: ({ row }) => (row.original.averageFillPrice !== undefined ? row.original.averageFillPrice.toFixed(5) : "—"),
  },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "createdAt", header: "Created", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
];

const executionColumns: ColumnDef<Execution, unknown>[] = [
  { accessorKey: "orderId", header: "Order" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "retries", header: "Retries", cell: ({ row }) => `${row.original.retryCount} / ${row.original.maxRetries}` },
  { accessorKey: "startedAt", header: "Started", cell: ({ row }) => new Date(row.original.startedAt).toLocaleString() },
  { accessorKey: "failureReason", header: "Failure Reason", cell: ({ row }) => row.original.failureReason ?? "—" },
];

export default function ExecutionPage() {
  const orders = useOrders();
  const executions = useExecutions();

  return (
    <div>
      <PageHeader title="Execution" description="Orders, executions, and fill status." actions={<CreateOrderDialog />} />

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <DataTable
            columns={orderColumns}
            data={orders.data?.items}
            isLoading={orders.isLoading}
            error={orders.error}
            onRetry={() => orders.refetch()}
            emptyTitle="No orders yet"
            emptyDescription="Orders placed for approved decisions will appear here."
          />
        </TabsContent>
        <TabsContent value="executions" className="mt-4">
          <DataTable
            columns={executionColumns}
            data={executions.data?.items}
            isLoading={executions.isLoading}
            error={executions.error}
            onRetry={() => executions.refetch()}
            emptyTitle="No executions yet"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
