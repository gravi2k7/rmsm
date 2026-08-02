"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import { useImportJobsByStatus } from "@/features/market-data-import-jobs/hooks/use-import-jobs";
import { JobDetailSheet } from "@/features/market-data-import-jobs/components/job-detail-sheet";
import { IMPORT_JOB_STATUSES } from "@/features/market-data-shared/types";
import type { ImportJob } from "@/features/market-data-shared/types";

export default function ImportJobsPage() {
  const [status, setStatus] = useState<string>("RUNNING");
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const jobs = useImportJobsByStatus(status);

  const columns: ColumnDef<ImportJob, unknown>[] = [
    { accessorKey: "id", header: "Job", cell: ({ row }) => row.original.id.slice(0, 8) },
    { accessorKey: "jobType", header: "Type" },
    { accessorKey: "providerId", header: "Provider", cell: ({ row }) => row.original.providerId.slice(0, 8) },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "startedAt", header: "Started", cell: ({ row }) => (row.original.startedAt ? formatDate(row.original.startedAt) : "—") },
    { accessorKey: "completedAt", header: "Completed", cell: ({ row }) => (row.original.completedAt ? formatDate(row.original.completedAt) : "—") },
    { accessorKey: "recordsProcessed", header: "Processed", cell: ({ row }) => row.original.recordsProcessed.toLocaleString() },
    { accessorKey: "recordsFailed", header: "Failed", cell: ({ row }) => row.original.recordsFailed.toLocaleString() },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedJob(row.original)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Jobs"
        description="Historical and incremental import jobs, filterable by status. Refreshes every 15 seconds."
      />

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          {IMPORT_JOB_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>
        {IMPORT_JOB_STATUSES.map((s) => (
          <TabsContent key={s} value={s}>
            <DataTable
              columns={columns}
              data={jobs.data}
              isLoading={jobs.isLoading}
              error={jobs.error}
              onRetry={() => jobs.refetch()}
              emptyTitle={`No ${s.toLowerCase().replace(/_/g, " ")} jobs`}
              onRowClick={(row) => setSelectedJob(row)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <JobDetailSheet job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
