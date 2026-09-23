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
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@rmsm/ui";

const GROUPS = [
  {
    name: "NAS100 RDSE Copier",
    source: "RMSM A2",
    followers: 3,
    mode: "Risk Scaled",
    status: "ACTIVE",
  },
  {
    name: "Gold Strategy Copier",
    source: "RMSM A2",
    followers: 1,
    mode: "Fixed Quantity",
    status: "PAUSED",
  },
];

export function CopierPage() {
  return (
    <div className="rmsm-mobile-glass-page w-full min-w-0 space-y-5 overflow-x-hidden pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Copy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Copier</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Replicate strategy executions across RMSM and connected broker accounts.
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
        <Metric icon={<Radio />} label="Active Groups" value="1" />
        <Metric icon={<Users />} label="Followers" value="4" />
        <Metric icon={<Activity />} label="Executions Today" value="0" />
        <Metric icon={<ShieldCheck />} label="Risk Mode" value="Protected" />
      </div>

      <Card>
        <CardHeader className="px-4 py-4 sm:px-6">
          <CardTitle>Copy Groups</CardTitle>
          <p className="text-muted-foreground text-sm">
            Manage sources, followers and execution rules.
          </p>
        </CardHeader>

        <CardContent className="grid gap-4 px-4 sm:px-6 lg:grid-cols-2">
          {GROUPS.map((group) => (
            <Card key={group.name} className="bg-muted/20">
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Source: {group.source}
                    </p>
                  </div>
                  <Badge variant={group.status === "ACTIVE" ? "success" : "secondary"}>
                    {group.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Followers" value={String(group.followers)} />
                  <Stat label="Execution" value={group.mode} />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    {group.status === "ACTIVE" ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Copy className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-medium">Build your first live copier</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Connect a broker, bind accounts and then create a copy group with fixed or risk-scaled execution.
          </p>
          <Button asChild className="mt-5">
            <Link href="/copier/new">Create Copy Group</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-primary mb-3">{icon}</div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
