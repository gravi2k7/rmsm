"use client";

import { useSearchParams } from "next/navigation";
import { StrategyTable } from "@/components/strategy/strategy-table";
import { SessionGate } from "@/components/ui-extra/session-gate";

export default function StrategySearchPage() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Search Strategies</h1>
      <SessionGate>
        <StrategyTable initialSearchText={q} />
      </SessionGate>
    </div>
  );
}
