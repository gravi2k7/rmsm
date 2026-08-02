"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button, toast } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import { useCoupons, useDeactivateCoupon } from "@/features/billing-coupons/hooks/use-coupons";
import { CreateCouponDialog } from "@/features/billing-coupons/components/create-coupon-dialog";
import { ApiError } from "@/lib/api-client";
import type { Coupon } from "@/features/billing-shared/types";

export default function CouponsPage() {
  const coupons = useCoupons();
  const deactivate = useDeactivateCoupon();

  async function handleDeactivate(id: string) {
    try {
      await deactivate.mutateAsync(id);
      toast.success("Coupon deactivated.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to deactivate coupon.");
    }
  }

  const columns: ColumnDef<Coupon, unknown>[] = [
    { accessorKey: "code", header: "Code" },
    { id: "discount", header: "Discount", cell: ({ row }) => `${row.original.value}${row.original.type === "PERCENTAGE" ? "%" : ` ${row.original.currency ?? ""}`}` },
    { accessorKey: "type", header: "Type" },
    { id: "expiration", header: "Expiration", cell: ({ row }) => formatDate(row.original.expiresAt) },
    { id: "limit", header: "Usage Limit", cell: ({ row }) => row.original.maxRedemptions ?? "Unlimited" },
    { id: "usage", header: "Usage Count", cell: ({ row }) => row.original.currentRedemptions },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.isActive ? "ACTIVE" : "ARCHIVED"} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDeactivate(row.original.id); }}>
            Deactivate
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Create and deactivate discount coupons. No edit/delete endpoint exists — deactivate is the only lifecycle action beyond creation."
        actions={<CreateCouponDialog />}
      />
      <DataTable
        columns={columns}
        data={coupons.data}
        isLoading={coupons.isLoading}
        error={coupons.error}
        onRetry={() => coupons.refetch()}
        emptyTitle="No coupons yet"
      />
    </div>
  );
}
