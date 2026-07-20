"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Gavel } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Alert,
  AlertDescription,
  Button,
} from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { TablePagination } from "@/components/ui-extra/table-pagination";
import { useDecisions } from "@/features/decisions/hooks/use-decisions";
import { DecisionReviewDialog } from "@/features/decisions/components/decision-review-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { paginateClientSide } from "@/lib/paginate-client-side";
import type { Decision } from "@/features/decisions/types";

type SortKey = "createdAt" | "riskScore";
const PAGE_SIZE = 20;

export default function DecisionCenterPage() {
  const decisionsQuery = useDecisions();
  const [status, setStatus] = useState<Decision["status"] | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<Decision | null>(null);

  const filtered = useMemo(() => {
    const all = decisionsQuery.data?.items ?? [];
    return status === "ALL" ? all : all.filter((d) => d.status === status);
  }, [decisionsQuery.data, status]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) =>
      sortKey === "riskScore" ? (a.riskScore - b.riskScore) * dir : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir,
    );
    return copy;
  }, [filtered, sortKey, sortDir]);

  const { pageItems, meta } = paginateClientSide(sorted, page, PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Decision Center</h1>
        <p className="text-sm text-muted-foreground">Risk-reviewed decisions awaiting or resulting from approval.</p>
      </div>

      <Select
        value={status}
        onValueChange={(v: Decision["status"] | "ALL") => {
          setStatus(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-48" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
          <SelectItem value="MANUAL_REVIEW">Manual Review</SelectItem>
        </SelectContent>
      </Select>

      {decisionsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load decisions. Please try again.</AlertDescription>
        </Alert>
      )}

      {decisionsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <EmptyState icon={<Gavel className="h-8 w-8" />} title="No decisions match your filter" />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button type="button" className="flex items-center gap-1 font-medium" onClick={() => toggleSort("riskScore")}>
                    Risk Score <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </TableHead>
                <TableHead>Risk Check</TableHead>
                <TableHead>Position Size</TableHead>
                <TableHead>
                  <button type="button" className="flex items-center gap-1 font-medium" onClick={() => toggleSort("createdAt")}>
                    Created <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{d.riskScore.toFixed(1)}</TableCell>
                  <TableCell>
                    <Badge variant={d.riskPassed ? "success" : "destructive"}>{d.riskPassed ? "Passed" : "Failed"}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{d.positionSizeUnits.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/decisions/${d.id}`}>Details</Link>
                      </Button>
                      {d.status === "PENDING" && (
                        <Button size="sm" onClick={() => setReviewTarget(d)}>
                          Review
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination pagination={meta} onPageChange={setPage} />
        </div>
      )}

      <DecisionReviewDialog decision={reviewTarget} open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)} />
    </div>
  );
}
