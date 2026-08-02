"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { usePlans } from "@/features/billing-plans/hooks/use-plans";
import { PlanFormDialog } from "@/features/billing-plans/components/plan-form-dialog";
import { PlanFeaturesPanel } from "@/features/billing-plans/components/plan-features-panel";
import { formatCents } from "@/features/billing-shared/format";
import type { SubscriptionPlan } from "@/features/billing-plans/types";

export default function SubscriptionPlansPage() {
  const plans = usePlans();

  const columns: ColumnDef<SubscriptionPlan, unknown>[] = [
    { accessorKey: "name", header: "Plan Name" },
    { accessorKey: "key", header: "Key" },
    { id: "monthly", header: "Monthly", cell: ({ row }) => formatCents(row.original.monthlyPriceCents, row.original.currency) },
    { id: "yearly", header: "Yearly", cell: ({ row }) => formatCents(row.original.yearlyPriceCents, row.original.currency) },
    { accessorKey: "trialDays", header: "Trial Days" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.isVisible ? (row.original.isActive ? "ACTIVE" : "ARCHIVED") : "ARCHIVED"} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <PlanFeaturesPanel plan={row.original} />
          <PlanFormDialog plan={row.original} />
          <PlanFormDialog cloneFrom={row.original} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        description="Create, edit, and archive billing plans. Delete has no backing API — Archive hides a plan from new signups without disrupting current subscribers."
        actions={<PlanFormDialog />}
      />
      <DataTable
        columns={columns}
        data={plans.data}
        isLoading={plans.isLoading}
        error={plans.error}
        onRetry={() => plans.refetch()}
        emptyTitle="No plans yet"
        emptyDescription="Create your first subscription plan to get started."
      />
    </div>
  );
}
