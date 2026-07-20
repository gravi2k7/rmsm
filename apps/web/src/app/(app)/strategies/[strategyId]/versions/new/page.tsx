"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, toast } from "@rmsm/ui";
import { RuleBuilder } from "@/components/strategy/rule-builder/rule-builder";
import { ParametersEditor } from "@/components/strategy/parameters-editor";
import { createEmptyGroup } from "@/lib/rule-tree-mapper";
import { useCreateVersion } from "@/hooks/use-strategy-versions";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { SessionGate } from "@/components/ui-extra/session-gate";
import type { RuleGroupNode, StrategyParameterDefinition } from "@/types/strategy";

function NewVersionForm() {
  const params = useParams<{ strategyId: string }>();
  const router = useRouter();
  const createVersion = useCreateVersion(params.strategyId);

  const [entryRules, setEntryRules] = useState<RuleGroupNode>(() => createEmptyGroup("AND"));
  const [exitRules, setExitRules] = useState<RuleGroupNode>(() => createEmptyGroup("AND"));
  const [parameters, setParameters] = useState<StrategyParameterDefinition[]>([]);
  const [dirty, setDirty] = useState(false);

  useUnsavedChangesWarning(dirty && !createVersion.isSuccess);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  function handleSave() {
    if (entryRules.children.length === 0) {
      toast.error("Entry rules must have at least one condition.");
      return;
    }
    createVersion.mutate(
      { entryRules, exitRules, parameters },
      {
        onSuccess: (version) => {
          toast.success(`Version ${version.versionNumber} created as DRAFT.`);
          router.push(`/strategies/${params.strategyId}/versions/${version.id}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create version."),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">New Strategy Version</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/strategies/${params.strategyId}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={createVersion.isPending}>
            Save Draft
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Entry Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleBuilder title="Entry" tree={entryRules} onChange={markDirty(setEntryRules)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exit Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleBuilder title="Exit" tree={exitRules} onChange={markDirty(setExitRules)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <ParametersEditor parameters={parameters} onChange={markDirty(setParameters)} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewVersionPage() {
  return (
    <SessionGate>
      <NewVersionForm />
    </SessionGate>
  );
}
