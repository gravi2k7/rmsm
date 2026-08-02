"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, Alert, AlertDescription, toast } from "@rmsm/ui";
import { Stepper } from "@/features/market-data-shared/components/stepper";
import { useProviders } from "@/features/market-data-providers/hooks/use-providers";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import { useScheduleImport, useResumeImport } from "@/features/market-data-import-jobs/hooks/use-import-jobs";
import { CANDLE_INTERVALS } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

const STEPS = ["Provider", "Instrument", "Timeframe & Range", "Review"];

export function ImportWizard() {
  const [step, setStep] = useState(0);
  const [providerConfigId, setProviderConfigId] = useState("");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [interval, setInterval] = useState<(typeof CANDLE_INTERVALS)[number]>("ONE_DAY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isIncremental, setIsIncremental] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const providers = useProviders();
  const instruments = useInstruments();
  const filteredInstruments = useMemo(() => {
    const needle = instrumentSearch.trim().toLowerCase();
    const all = instruments.data?.data ?? [];
    if (!needle) return all;
    return all.filter((i) => i.symbol.toLowerCase().includes(needle) || i.name.toLowerCase().includes(needle));
  }, [instruments.data, instrumentSearch]);
  const scheduleImport = useScheduleImport();
  const resumeImport = useResumeImport();

  const provider = providers.data?.find((p) => p.id === providerConfigId);
  const instrument = instruments.data?.data.find((i) => i.id === instrumentId);

  const canProceed = [!!providerConfigId, !!instrumentId, !!from && !!to, true][step];

  async function handleSubmit() {
    try {
      const job = await scheduleImport.mutateAsync({
        instrumentId,
        providerConfigId,
        interval,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        isIncremental,
      });
      setCreatedJobId(job.id);
      toast.success("Import scheduled.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to schedule import.");
    }
  }

  async function handleResume() {
    if (!createdJobId) return;
    try {
      await resumeImport.mutateAsync(createdJobId);
      toast.success("Resume requested.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to resume import.");
    }
  }

  if (createdJobId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          <div>
            <p className="font-medium">Import job scheduled</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Job <code>{createdJobId}</code> is now queued. There is no live progress stream in this API — track its status, records
              processed, and retry/resume it from the Import Jobs page.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/market-data/import-jobs">View Import Jobs</Link>
            </Button>
            <Button variant="outline" onClick={handleResume} disabled={resumeImport.isPending}>
              {resumeImport.isPending ? "Resuming…" : "Resume if interrupted"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCreatedJobId(null);
                setStep(0);
                setProviderConfigId("");
                setInstrumentId("");
                setFrom("");
                setTo("");
              }}
            >
              Start another import
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Stepper steps={STEPS} currentStep={step} />

        {step === 0 && (
          <div className="space-y-2">
            <Label>Select Provider</Label>
            <Select value={providerConfigId} onValueChange={setProviderConfigId}>
              <SelectTrigger>
                <SelectValue placeholder={providers.isLoading ? "Loading…" : "Select a provider"} />
              </SelectTrigger>
              <SelectContent>
                {(providers.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label>Select Instrument</Label>
            <Input placeholder="Filter loaded instruments…" value={instrumentSearch} onChange={(e) => setInstrumentSearch(e.target.value)} />
            <Select value={instrumentId} onValueChange={setInstrumentId}>
              <SelectTrigger>
                <SelectValue placeholder={instruments.isLoading ? "Loading…" : "Select an instrument"} />
              </SelectTrigger>
              <SelectContent>
                {filteredInstruments.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.symbol} — {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Incremental</p>
                <p className="text-xs text-muted-foreground">One-click today-only import instead of the full date range above.</p>
              </div>
              <Switch checked={isIncremental} onCheckedChange={setIsIncremental} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Provider</dt><dd>{provider?.name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Instrument</dt><dd>{instrument ? `${instrument.symbol} — ${instrument.name}` : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Timeframe</dt><dd>{interval.replaceAll("_", " ")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Range</dt><dd>{from} → {to}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Incremental</dt><dd>{isIncremental ? "Yes" : "No"}</dd></div>
            </dl>
            {scheduleImport.isError && (
              <Alert variant="destructive">
                <AlertDescription>{scheduleImport.error instanceof ApiError ? scheduleImport.error.message : "Failed to schedule import."}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={scheduleImport.isPending}>
              {scheduleImport.isPending ? "Scheduling…" : "Schedule Import"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
