"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Copy,
  Pause,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rmsm/ui";
import { useSessionStore } from "@/lib/session-store";
import {
  useCopyGroups,
  useUpdateCopyGroup,
} from "@/features/copier/hooks";

export function CopierPage() {
  const organizationId =
    useSessionStore((state) => state.organizationId) ??
    undefined;

  const groupsQuery = useCopyGroups(organizationId);
  const updateGroup = useUpdateCopyGroup(organizationId);

  const groups = groupsQuery.data ?? [];

  const activeGroups = groups.filter(
    (group) => group.status === "ACTIVE",
  );

  const followerCount = groups.reduce(
    (total, group) =>
      total +
      group.members.filter(
        (member) =>
          member.role === "FOLLOWER" && member.enabled,
      ).length,
    0,
  );

  const handleToggleStatus = (
    groupId: string,
    status: "ACTIVE" | "PAUSED",
  ) => {
    updateGroup.mutate({
      groupId,
      status,
    });
  };

  return (
    <div className="rmsm-mobile-glass-page w-full min-w-0 space-y-5 overflow-x-hidden pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Copy className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Copier
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Replicate strategy executions across RMSM and connected
              broker accounts.
            </p>
          </div>
        </div>

        <Button asChild className="gap-2">
          <Link href="/copier/new">
            <Plus className="h-4 w-4" />
            Create Copy Group
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={<Radio />}
          label="Active Groups"
          value={String(activeGroups.length)}
          isLoading={groupsQuery.isLoading}
        />

        <Metric
          icon={<Users />}
          label="Followers"
          value={String(followerCount)}
          isLoading={groupsQuery.isLoading}
        />

        <Metric
          icon={<Activity />}
          label="Executions Today"
          value="0"
          isLoading={groupsQuery.isLoading}
        />

        <Metric
          icon={<ShieldCheck />}
          label="Risk Mode"
          value="Protected"
          isLoading={groupsQuery.isLoading}
        />
      </div>

      <Card>
        <CardHeader className="px-4 py-4 sm:px-6">
          <CardTitle>Copy Groups</CardTitle>
          <p className="text-muted-foreground text-sm">
            Manage sources, followers and execution rules.
          </p>
        </CardHeader>

        <CardContent className="grid gap-4 px-4 sm:px-6 lg:grid-cols-2">
          {groupsQuery.isLoading && (
            <div className="text-muted-foreground py-8 text-center text-sm lg:col-span-2">
              Loading copy groups...
            </div>
          )}

          {groupsQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm lg:col-span-2">
              <p className="font-medium">
                Unable to load copy groups.
              </p>
              <p className="text-muted-foreground mt-1">
                {groupsQuery.error instanceof Error
                  ? groupsQuery.error.message
                  : "The Copier API request failed."}
              </p>
            </div>
          )}

          {!groupsQuery.isLoading &&
            !groupsQuery.isError &&
            groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center lg:col-span-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Copy className="h-5 w-5" />
                </div>

                <h3 className="mt-4 font-medium">
                  No copy groups yet
                </h3>

                <p className="text-muted-foreground mt-1 max-w-md text-sm">
                  Create a copy group and configure its follower
                  accounts to begin.
                </p>

                <Button asChild className="mt-5">
                  <Link href="/copier/new">
                    Create Copy Group
                  </Link>
                </Button>
              </div>
            )}

          {groups.map((group) => {
            const followers = group.members.filter(
              (member) => member.role === "FOLLOWER",
            );

            const enabledFollowers = followers.filter(
              (member) => member.enabled,
            );

            const mode = followers.some(
              (member) =>
                member.fixedQuantity !== null &&
                member.fixedQuantity !== "",
            )
              ? "Fixed Quantity"
              : "Risk Scaled";

            const isActive = group.status === "ACTIVE";
            const isUpdating =
              updateGroup.isPending &&
              updateGroup.variables?.groupId === group.id;

            return (
              <Card
                key={group.id}
                className="bg-muted/20"
              >
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {group.name}
                      </h3>

                      <p className="text-muted-foreground mt-1 text-xs">
                        Source: {group.masterAccount.name}
                      </p>
                    </div>

                    <Badge
                      variant={
                        isActive ? "success" : "secondary"
                      }
                    >
                      {group.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      label="Followers"
                      value={`${enabledFollowers.length}/${followers.length}`}
                    />

                    <Stat
                      label="Execution"
                      value={mode}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      disabled={isUpdating}
                      onClick={() =>
                        handleToggleStatus(
                          group.id,
                          isActive ? "PAUSED" : "ACTIVE",
                        )
                      }
                    >
                      {isActive ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          {isUpdating ? "Pausing..." : "Pause"}
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          {isUpdating ? "Activating..." : "Activate"}
                        </>
                      )}
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Link href={`/copier/${group.id}`}>
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {groups.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Copy className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-medium">
              Create another copy group
            </h3>

            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Configure another source account and its follower
              execution rules.
            </p>

            <Button asChild className="mt-5">
              <Link href="/copier/new">
                Create Copy Group
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-primary mb-3">{icon}</div>
        <p className="text-muted-foreground text-xs">
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold">
          {isLoading ? "—" : value}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <p className="text-muted-foreground text-[11px]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}
