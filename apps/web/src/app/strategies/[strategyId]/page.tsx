"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Copy, FolderInput, Plus, Send } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@rmsm/ui";
import { SessionGate } from "@/components/ui-extra/session-gate";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { ConfirmDialog } from "@/components/ui-extra/confirm-dialog";
import { StrategyStatusBadge, VersionStatusBadge } from "@/components/strategy/status-badges";
import { useArchiveStrategy, useCloneStrategy, usePublishLatestApproved, useStrategy } from "@/hooks/use-strategies";
import { useStrategyVersions } from "@/hooks/use-strategy-versions";

function StrategyDetailsContent({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const strategy = useStrategy(strategyId);
  const versions = useStrategyVersions(strategyId);
  const archiveMutation = useArchiveStrategy();
  const cloneMutation = useCloneStrategy();
  const publishMutation = usePublishLatestApproved(strategyId);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");

  if (strategy.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (strategy.isError || !strategy.data) {
    return <EmptyState title="Strategy not found" description={strategy.error instanceof Error ? strategy.error.message : "Unknown error"} />;
  }

  const s = strategy.data;
  const hasApprovedVersion = versions.data?.some((v) => v.status === "APPROVED") ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{s.name}</h1>
            <StrategyStatusBadge status={s.status} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{s.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {s.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCloneName(`${s.name} (copy)`);
              setCloneOpen(true);
            }}
          >
            <Copy /> Clone
          </Button>
          {hasApprovedVersion && (
            <Button onClick={() => setPublishOpen(true)}>
              <Send /> Publish latest approved
            </Button>
          )}
          {s.status === "ACTIVE" && (
            <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
              <FolderInput /> Archive
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Category" value={s.category.replace(/_/g, " ")} />
              <Row label="Currently published version" value={s.currentPublishedVersionId ?? "None"} />
              <Row label="Created" value={new Date(s.createdAt).toLocaleString()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Versions</CardTitle>
              <Button size="sm" asChild>
                <Link href={`/strategies/${strategyId}/versions/new`}>
                  <Plus /> New Version
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {versions.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : versions.data && versions.data.length > 0 ? (
                <ul className="divide-y">
                  {versions.data.map((v) => (
                    <li key={v.id} className="flex items-center justify-between py-2">
                      <Link href={`/strategies/${strategyId}/versions/${v.id}`} className="text-sm font-medium hover:underline">
                        v{v.versionNumber}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
                        <VersionStatusBadge status={v.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No versions yet"
                  description="Create the first version to define this strategy's entry and exit rules."
                  action={
                    <Button size="sm" asChild>
                      <Link href={`/strategies/${strategyId}/versions/new`}>
                        <Plus /> New Version
                      </Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive strategy?"
        description={`"${s.name}" will be archived.`}
        destructive
        confirmLabel="Archive"
        loading={archiveMutation.isPending}
        onConfirm={() =>
          archiveMutation.mutate(s.id, {
            onSuccess: () => {
              toast.success("Strategy archived.");
              setArchiveOpen(false);
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to archive strategy."),
          })
        }
      />

      <ConfirmDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        title="Clone strategy"
        description={
          <div className="space-y-2 text-left">
            <p>Create a copy of &quot;{s.name}&quot; with its latest version&apos;s rules.</p>
            <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} aria-label="New strategy name" />
          </div>
        }
        confirmLabel="Clone"
        loading={cloneMutation.isPending}
        onConfirm={() =>
          cloneMutation.mutate(
            { strategyId: s.id, newName: cloneName.trim() },
            {
              onSuccess: (created) => {
                toast.success(`Cloned as "${created.name}".`);
                router.push(`/strategies/${created.id}`);
              },
              onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to clone strategy."),
            },
          )
        }
      />

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publish latest approved version?"
        description="This resolves and publishes this strategy's most recently approved version."
        confirmLabel="Publish"
        loading={publishMutation.isPending}
        onConfirm={() =>
          publishMutation.mutate(undefined, {
            onSuccess: () => {
              toast.success("Version published.");
              setPublishOpen(false);
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to publish version."),
          })
        }
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function StrategyDetailsPage() {
  const params = useParams<{ strategyId: string }>();
  return (
    <SessionGate>
      <StrategyDetailsContent strategyId={params.strategyId} />
    </SessionGate>
  );
}
