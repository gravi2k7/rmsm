"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, Button, Skeleton, toast } from "@rmsm/ui";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/features/billing-shared/format";
import { useValidationReport, useRetryImport, useResumeImport } from "../hooks/use-import-jobs";
import type { ImportJob } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

export function JobDetailSheet({ job, onClose }: { job: ImportJob | null; onClose: () => void }) {
  const report = useValidationReport(job?.id);
  const retry = useRetryImport();
  const resume = useResumeImport();

  async function handleRetry() {
    if (!job) return;
    try {
      await retry.mutateAsync(job.id);
      toast.success("Retry requested.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to retry job.");
    }
  }

  async function handleResume() {
    if (!job) return;
    try {
      await resume.mutateAsync(job.id);
      toast.success("Resume requested.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to resume job.");
    }
  }

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

            <div className="mt-6">
              <h4 className="text-sm font-medium">Validation Report</h4>
              {report.isLoading && <Skeleton className="mt-2 h-16 w-full" />}
              {report.isError && <p className="mt-2 text-sm text-muted-foreground">No validation report available for this job.</p>}
              {report.data && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted p-2 text-xs">{JSON.stringify(report.data, null, 2)}</pre>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              {job.status === "FAILED" && (
                <Button onClick={handleRetry} disabled={retry.isPending}>
                  {retry.isPending ? "Retrying…" : "Retry"}
                </Button>
              )}
              {(job.status === "PARTIAL" || job.status === "FAILED") && (
                <Button variant="outline" onClick={handleResume} disabled={resume.isPending}>
                  {resume.isPending ? "Resuming…" : "Resume"}
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This API has no cancel endpoint for in-flight jobs — only retry (failed) and resume (partial/failed) are available.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
