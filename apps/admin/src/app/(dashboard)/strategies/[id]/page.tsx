"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@rmsm/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@rmsm/ui";
import { Archive } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  LoadingState,
  ErrorState,
} from "@/components/shared/data-states";

import {
  useStrategy,
  useArchiveStrategy,
} from "@/features/strategies/hooks/use-strategies";

import { ApiError } from "@/lib/api-client";

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();

  const strategy = useStrategy(id);
  const archiveStrategy = useArchiveStrategy();

  if (strategy.isLoading) {
    return <LoadingState />;
  }

  if (strategy.error || !strategy.data) {
    return (
      <ErrorState
        error={strategy.error}
        onRetry={() => strategy.refetch()}
      />
    );
  }

  const data = strategy.data;

  async function handleArchive() {
    try {
      await archiveStrategy.mutateAsync(id);

      toast.success("Strategy archived.");

      router.push("/strategies");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Failed to archive strategy.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description}
        actions={
          data.status !== "ARCHIVED" ? (
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archiveStrategy.isPending}
            >
              <Archive
                className="mr-2 h-4 w-4"
                aria-hidden="true"
              />

              {archiveStrategy.isPending
                ? "Archiving…"
                : "Archive"}
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Overview
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Status
              </span>

              <StatusBadge status={data.status} />
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Category
              </span>

              <span>
                {data.category.replace(/_/g, " ")}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Organization
              </span>

              <span className="truncate max-w-[240px]">
                {data.organizationId}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Created By
              </span>

              <span className="truncate max-w-[240px]">
                {data.createdByUserId}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Created
              </span>

              <span>
                {new Date(
                  data.createdAt,
                ).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Published Version
              </span>

              <span className="truncate max-w-[240px]">
                {data.currentPublishedVersionId ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tags
            </CardTitle>
          </CardHeader>

          <CardContent>
            {data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tags assigned.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
