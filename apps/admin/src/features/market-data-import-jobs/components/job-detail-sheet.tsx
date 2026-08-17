"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@rmsm/ui";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import type { ImportJob } from "@/features/market-data-shared/types";

export function JobDetailSheet({ job, onClose }: { job: ImportJob | null; onClose: () => void }) {

  return (
    <Sheet open={!!job} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {job && (
          <>
            <SheetHeader>
              <SheetTitle>Import Job {job.id.slice(0, 8)}</SheetTitle>
              <SheetDescription>{job.jobType} — <StatusBadge status={job.status} /></SheetDescription>
            </SheetHeader>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Provider</dt><dd>{job.providerId}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Started</dt><dd>{job.startedAt ? formatDate(job.startedAt) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Completed</dt><dd>{job.completedAt ? formatDate(job.completedAt) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Records processed</dt><dd>{job.recordsProcessed.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Records failed</dt><dd>{job.recordsFailed.toLocaleString()}</dd></div>
              {job.errorSummary && (
                <div>
                  <dt className="text-muted-foreground">Error summary</dt>
                  <dd className="mt-1 rounded-md bg-destructive/10 p-2 text-destructive">{job.errorSummary}</dd>
                </div>
              )}
            </dl>

          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
