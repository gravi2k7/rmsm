"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch, Alert, AlertDescription, toast } from "@rmsm/ui";
import { useMarketDataSettings, useUpsertMarketDataSetting } from "@/features/market-data-settings/hooks/use-market-data-settings";
import { ApiError } from "@/lib/api-client";

const KEYS = {
  maxRetryAttempts: "market-data.import.max_retry_attempts",
  retryBackoffSeconds: "market-data.import.retry_backoff_seconds",
  schedulerEnabled: "market-data.scheduler.enabled",
  schedulerIntervalMinutes: "market-data.scheduler.interval_minutes",
  maxConcurrentImports: "market-data.import.max_concurrent",
  maxImportRangeDays: "market-data.import.max_range_days",
  candleRetentionDays: "market-data.storage.candle_retention_days",
  minQualityScore: "market-data.quality.min_quality_score",
  minConfidenceScore: "market-data.quality.min_confidence_score",
} as const;

export default function MarketDataSettingsPage() {
  const settings = useMarketDataSettings();
  const upsert = useUpsertMarketDataSetting();

  const [maxRetryAttempts, setMaxRetryAttempts] = useState("3");
  const [retryBackoffSeconds, setRetryBackoffSeconds] = useState("30");
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [schedulerIntervalMinutes, setSchedulerIntervalMinutes] = useState("15");
  const [maxConcurrentImports, setMaxConcurrentImports] = useState("5");
  const [maxImportRangeDays, setMaxImportRangeDays] = useState("365");
  const [candleRetentionDays, setCandleRetentionDays] = useState("1825");
  const [minQualityScore, setMinQualityScore] = useState("0.8");
  const [minConfidenceScore, setMinConfidenceScore] = useState("0.8");

  useEffect(() => {
    if (!settings.data) return;
    const byKey = new Map(settings.data.map((s) => [s.key, s.value]));
    if (byKey.has(KEYS.maxRetryAttempts)) setMaxRetryAttempts(String(byKey.get(KEYS.maxRetryAttempts)));
    if (byKey.has(KEYS.retryBackoffSeconds)) setRetryBackoffSeconds(String(byKey.get(KEYS.retryBackoffSeconds)));
    if (byKey.has(KEYS.schedulerEnabled)) setSchedulerEnabled(Boolean(byKey.get(KEYS.schedulerEnabled)));
    if (byKey.has(KEYS.schedulerIntervalMinutes)) setSchedulerIntervalMinutes(String(byKey.get(KEYS.schedulerIntervalMinutes)));
    if (byKey.has(KEYS.maxConcurrentImports)) setMaxConcurrentImports(String(byKey.get(KEYS.maxConcurrentImports)));
    if (byKey.has(KEYS.maxImportRangeDays)) setMaxImportRangeDays(String(byKey.get(KEYS.maxImportRangeDays)));
    if (byKey.has(KEYS.candleRetentionDays)) setCandleRetentionDays(String(byKey.get(KEYS.candleRetentionDays)));
    if (byKey.has(KEYS.minQualityScore)) setMinQualityScore(String(byKey.get(KEYS.minQualityScore)));
    if (byKey.has(KEYS.minConfidenceScore)) setMinConfidenceScore(String(byKey.get(KEYS.minConfidenceScore)));
  }, [settings.data]);

  async function handleSave() {
    try {
      await Promise.all([
        upsert.mutateAsync({ key: KEYS.maxRetryAttempts, value: Number(maxRetryAttempts), description: "Maximum retry attempts for a failed import job" }),
        upsert.mutateAsync({ key: KEYS.retryBackoffSeconds, value: Number(retryBackoffSeconds), description: "Backoff between import retries (seconds)" }),
        upsert.mutateAsync({ key: KEYS.schedulerEnabled, value: schedulerEnabled, description: "Automatic incremental import scheduling enabled" }),
        upsert.mutateAsync({ key: KEYS.schedulerIntervalMinutes, value: Number(schedulerIntervalMinutes), description: "Scheduler run interval (minutes)" }),
        upsert.mutateAsync({ key: KEYS.maxConcurrentImports, value: Number(maxConcurrentImports), description: "Maximum concurrent import jobs" }),
        upsert.mutateAsync({ key: KEYS.maxImportRangeDays, value: Number(maxImportRangeDays), description: "Maximum date range (days) per historical import request" }),
        upsert.mutateAsync({ key: KEYS.candleRetentionDays, value: Number(candleRetentionDays), description: "Candle retention period (days) before archival/deletion policy applies" }),
        upsert.mutateAsync({ key: KEYS.minQualityScore, value: Number(minQualityScore), description: "Minimum acceptable candle quality score" }),
        upsert.mutateAsync({ key: KEYS.minConfidenceScore, value: Number(minConfidenceScore), description: "Minimum acceptable candle confidence score" }),
      ]);
      toast.success("Market Data settings saved.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save settings.");
    }
  }

  if (settings.isLoading) return <LoadingState rows={5} />;
  if (settings.error) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;

  return (
    <div>
      <PageHeader
        title="Market Data Settings"
        description="Platform-wide import, retention, and quality-threshold configuration."
        actions={
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving…" : "Save Changes"}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retry Strategy</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxRetryAttempts">Max Retry Attempts</Label>
              <Input id="maxRetryAttempts" type="number" min={0} value={maxRetryAttempts} onChange={(e) => setMaxRetryAttempts(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retryBackoffSeconds">Retry Backoff (seconds)</Label>
              <Input id="retryBackoffSeconds" type="number" min={0} value={retryBackoffSeconds} onChange={(e) => setRetryBackoffSeconds(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Automatic Incremental Imports</p>
                <p className="text-xs text-muted-foreground">Run scheduled incremental imports on the interval below.</p>
              </div>
              <Switch checked={schedulerEnabled} onCheckedChange={setSchedulerEnabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedulerIntervalMinutes">Interval (minutes)</Label>
              <Input id="schedulerIntervalMinutes" type="number" min={1} value={schedulerIntervalMinutes} onChange={(e) => setSchedulerIntervalMinutes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Limits</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxConcurrentImports">Max Concurrent Imports</Label>
              <Input id="maxConcurrentImports" type="number" min={1} value={maxConcurrentImports} onChange={(e) => setMaxConcurrentImports(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxImportRangeDays">Max Import Range (days)</Label>
              <Input id="maxImportRangeDays" type="number" min={1} value={maxImportRangeDays} onChange={(e) => setMaxImportRangeDays(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retention &amp; Storage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="candleRetentionDays">Candle Retention (days)</Label>
            <Input id="candleRetentionDays" type="number" min={1} value={candleRetentionDays} onChange={(e) => setCandleRetentionDays(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minQualityScore">Min Quality Score</Label>
              <Input id="minQualityScore" type="number" min={0} max={1} step={0.01} value={minQualityScore} onChange={(e) => setMinQualityScore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minConfidenceScore">Min Confidence Score</Label>
              <Input id="minConfidenceScore" type="number" min={0} max={1} step={0.01} value={minConfidenceScore} onChange={(e) => setMinConfidenceScore(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="mt-6">
        <AlertDescription>
          These values are stored via the platform&apos;s generic configuration store and are not yet read back by the import/quality
          pipeline itself — there is no backend wiring that consumes a &quot;market-data&quot; settings category today. Provider priority is
          managed per-provider on the Providers page, not here, since it already has its own dedicated endpoint. Normalization rules
          have no configurable surface in this API (normalization logic is fixed in code), so no control for it is offered here.
        </AlertDescription>
      </Alert>
    </div>
  );
}
