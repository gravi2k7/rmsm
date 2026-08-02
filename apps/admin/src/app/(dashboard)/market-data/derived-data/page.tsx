"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Skeleton, Alert, AlertDescription, toast } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import { useGenerateDerivedData, useLatestIndicatorsFanout } from "@/features/market-data-derived-data/hooks/use-derived-data";
import { CANDLE_INTERVALS, DERIVED_INDICATOR_KEYS } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

export default function DerivedDataPage() {
  const [instrumentId, setInstrumentId] = useState("");
  const [interval, setInterval] = useState<(typeof CANDLE_INTERVALS)[number]>("ONE_DAY");
  const [lastGenerated, setLastGenerated] = useState<number | null>(null);

  const instruments = useInstruments();
  const generate = useGenerateDerivedData();
  const indicators = useLatestIndicatorsFanout(instrumentId || undefined, interval);

  async function handleGenerate() {
    try {
      const result = await generate.mutateAsync({ instrumentId, interval });
      setLastGenerated(result.indicatorsWritten);
      toast.success(`${result.indicatorsWritten} indicator value(s) written.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to generate derived data.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Derived Data" description="Computed technical indicators for the latest bar of an instrument/timeframe." />

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
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </CardContent>
      </Card>

      {lastGenerated !== null && (
        <Alert>
          <AlertDescription>Last generation run wrote {lastGenerated} indicator value(s) for this instrument/timeframe.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Indicator Values</CardTitle>
        </CardHeader>
        <CardContent>
          {!instrumentId && <p className="text-sm text-muted-foreground">Select an instrument and timeframe to view its latest indicators.</p>}
          {instrumentId && indicators.isLoading && <Skeleton className="h-40 w-full" />}
          {instrumentId && !indicators.isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DERIVED_INDICATOR_KEYS.map((key) => {
                const snapshot = indicators.byKey[key];
                return (
                  <div key={key} className="rounded-md border p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{key.replace(/_/g, " ")}</p>
                    {snapshot ? (
                      <pre className="mt-1 max-h-24 overflow-auto text-xs">{JSON.stringify(snapshot.outputs, null, 2)}</pre>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Not yet generated.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          This pipeline computes indicators for the latest bar only — there is no resampling/aggregation endpoint for historical
          derived series, so those aren&apos;t offered here.
        </AlertDescription>
      </Alert>
    </div>
  );
}
