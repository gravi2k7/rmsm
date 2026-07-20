"use client";

import { useState } from "react";
import { GitCompare } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Skeleton, Badge } from "@rmsm/ui";
import { useStrategyVersion } from "@/hooks/use-strategy-versions";
import { VersionStatusBadge } from "@/components/strategy/status-badges";
import type { StrategyVersion, RuleTreeNode } from "@/types/strategy";

function countRuleNodes(node: RuleTreeNode): number {
  if (node.kind === "rule") return 1;
  return 1 + node.children.reduce((sum, child) => sum + countRuleNodes(child), 0);
}

function VersionColumn({ version, isLoading }: { version: StrategyVersion | undefined; isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!version) return <p className="text-sm text-muted-foreground">Select a version.</p>;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">v{version.versionNumber}</span>
        <VersionStatusBadge status={version.status} />
      </div>
      <div className="flex justify-between border-b py-1.5">
        <span className="text-muted-foreground">Created</span>
        <span>{new Date(version.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between border-b py-1.5">
        <span className="text-muted-foreground">Entry rule nodes</span>
        <span>{countRuleNodes(version.entryRules)}</span>
      </div>
      <div className="flex justify-between border-b py-1.5">
        <span className="text-muted-foreground">Exit rule nodes</span>
        <span>{countRuleNodes(version.exitRules)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Parameters ({version.parameters.length})</span>
        <ul className="mt-1 space-y-1">
          {version.parameters.map((p) => (
            <li key={p.name} className="flex items-center justify-between">
              <span>{p.name}</span>
              <Badge variant="outline">{p.type}</Badge>
            </li>
          ))}
          {version.parameters.length === 0 && <li className="text-muted-foreground">None</li>}
        </ul>
      </div>
    </div>
  );
}

export function CompareVersionsDialog({ versions }: { versions: { id: string; versionNumber: number }[] }) {
  const [open, setOpen] = useState(false);
  const [leftId, setLeftId] = useState<string | undefined>(versions[0]?.id);
  const [rightId, setRightId] = useState<string | undefined>(versions[1]?.id);

  const left = useStrategyVersion(open ? leftId : undefined);
  const right = useStrategyVersion(open ? rightId : undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={versions.length < 2}>
        <GitCompare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Compare Versions
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compare versions</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger aria-label="First version">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.versionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <VersionColumn version={left.data} isLoading={left.isLoading} />
          </div>
          <div className="space-y-3">
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger aria-label="Second version">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.versionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <VersionColumn version={right.data} isLoading={right.isLoading} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
