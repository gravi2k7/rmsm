"use client";

import { StrategyTable } from "@/components/strategy/strategy-table";
import { SessionGate } from "@/components/ui-extra/session-gate";

export default function StrategyListPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">All Strategies</h1>
      <SessionGate>
        <StrategyTable />
      </SessionGate>
    </div>
  );
}
