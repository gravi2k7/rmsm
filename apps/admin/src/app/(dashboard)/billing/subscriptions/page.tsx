"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScopeBanner } from "@/features/billing-shared/components/scope-banner";
import { RestrictedCell } from "@/features/billing-shared/components/restricted-cell";
import { formatCents, formatDate } from "@/features/billing-shared/format";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@rmsm/ui";
import { useCustomerSubscriptions } from "@/features/billing-subscriptions/hooks/use-customer-subscriptions";
import { SubscriptionActionsMenu } from "@/features/billing-subscriptions/components/subscription-actions-menu";
import { SUBSCRIPTION_STATUSES, type OrganizationSubscriptionWithPlan } from "@/features/billing-shared/types";
import type { Organization } from "@/features/organizations/types";

interface Row {
  organization: Organization;
  subscription?: OrganizationSubscriptionWithPlan;
  restricted: boolean;
}

export default function CustomerSubscriptionsPage() {
  const { rows, organizationsQuery } = useCustomerSubscriptions();
  const [status, setStatus] = useState<string>("ALL");
  const [planKey, setPlanKey] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const tableRows: Row[] = rows.map((r) => ({ organization: r.organization, subscription: r.data, restricted: r.restricted }));

  const planOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const r of tableRows) if (r.subscription) keys.add(r.subscription.plan.key);
    return Array.from(keys);
  }, [tableRows]);

  const filtered = tableRows.filter((r) => {
    if (status !== "ALL" && r.subscription?.status !== status) return false;
    if (planKey !== "ALL" && r.subscription?.plan.key !== planKey) return false;
    if (search && !r.organization.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: ColumnDef<Row, unknown>[] = [
    { id: "organization", header: "Organization", cell: ({ row }) => row.original.organization.name },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => (row.original.restricted ? <RestrictedCell /> : (row.original.subscription?.plan.name ?? "No subscription")),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (row.original.restricted || !row.original.subscription ? "—" : <StatusBadge status={row.original.subscription.status} />),
    },
    {
      id: "renewal",
      header: "Renewal Date",
      cell: ({ row }) => (row.original.restricted ? "—" : formatDate(row.original.subscription?.renewalDate)),
    },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) =>
        row.original.restricted || !row.original.subscription
          ? "—"
          : `${formatCents(row.original.subscription.billingCycle === "YEARLY" ? row.original.subscription.plan.yearlyPriceCents : row.original.subscription.plan.monthlyPriceCents)} / ${row.original.subscription.billingCycle.toLowerCase()}`,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        !row.original.restricted && row.original.subscription ? (
          <div onClick={(e) => e.stopPropagation()}>
            <SubscriptionActionsMenu organizationId={row.original.organization.id} subscription={row.original.subscription} />
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Customer Subscriptions" description="Subscription status across organizations." />
      <ScopeBanner />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search organization…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {SUBSCRIPTION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planKey} onValueChange={setPlanKey}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All plans</SelectItem>
            {planOptions.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={organizationsQuery.isLoading}
        error={organizationsQuery.error}
        onRetry={() => organizationsQuery.refetch()}
        emptyTitle="No subscriptions match these filters"
      />
    </div>
  );
}
