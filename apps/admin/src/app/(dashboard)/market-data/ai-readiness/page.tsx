"use client";

import { useState } from "react";
import { BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Skeleton, Alert, AlertDescription, Badge, toast } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate } from "@/features/billing-shared/format";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import { useGenerateAiReadiness, useLatestAiReadiness } from "@/features/market-data-ai-readiness/hooks/use-ai-readiness";
import { CANDLE_INTERVALS } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

const FIELDS: { key: "trend" | "volatility" | "liquidity" | "confidence" | "session" | "spread" | "marketRegime"; label: string }[] = [
  { key: "trend", label: "Trend" },
  { key: "volatility", label: "Volatility" },
  { key: "liquidity", label: "Liquidity" },
  { key: "confidence", label: "Confidence" },
  { key: "session", label: "Session" },
  { key: "spread", label: "Spread" },
  { key: "marketRegime", label: "Market Regime" },
];

export default function AiReadinessPage() {
  const [instrumentId, setInstrumentId] = useState("");
  const [interval, setInterval] = useState<(typeof CANDLE_INTERVALS)[number]>("ONE_DAY");

  const instruments = useInstruments();
  const generate = useGenerateAiReadiness();
  const snapshot = useLatestAiReadiness(instrumentId || undefined, interval);

  async function handleGenerate() {
    try {
      await generate.mutateAsync({ instrumentId, interval });
      toast.success("AI readiness snapshot generated.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to generate AI readiness snapshot.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Readiness" description="Feature-readiness snapshot (trend, volatility, liquidity, confidence, regime) for one instrument/timeframe." />

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Instrument</Label>
            <Select value={instrumentId} onValueChange={setInstrumentId}>
              <SelectTrigger>
                <SelectValue placeholder={instruments.isLoading ? "Loading…" : "Select an instrument"} />
              </SelectTrigger>
              <SelectContent>
                {(instruments.data?.data ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.symbol} — {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <Label>Timeframe</Label>
            <Select value={interval} onValueChange={(v) => setInterval(v as (typeof CANDLE_INTERVALS)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANDLE_INTERVALS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={!instrumentId || generate.isPending}>
            <BrainCircuit className="mr-2 h-4 w-4" aria-hidden="true" />
            {generate.isPending ? "Generating…" : "Generate Snapshot"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {!instrumentId && <p className="text-sm text-muted-foreground">Select an instrument and timeframe to view its latest AI-readiness snapshot.</p>}
          {instrumentId && snapshot.isLoading && <Skeleton className="h-32 w-full" />}
          {instrumentId && snapshot.isError && <p className="text-sm text-muted-foreground">No snapshot generated yet for this instrument/timeframe.</p>}
          {snapshot.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1">{snapshot.data[key] ? <Badge variant="secondary">{String(snapshot.data[key])}</Badge> : "—"}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Anomaly Flags</p>
                <p className="mt-1 text-sm">
                  {snapshot.data.anomalyFlags && snapshot.data.anomalyFlags.length > 0 ? JSON.stringify(snapshot.data.anomalyFlags) : "None"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Computed {formatDate(snapshot.data.computedAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          AI Readiness is computed per instrument/timeframe on demand — there is no platform-wide coverage, embedding-readiness, or
          training-readiness aggregate endpoint, so a fleet-wide percentage is not shown here rather than being estimated.
        </AlertDescription>
      </Alert>
    </div>
  );
}
