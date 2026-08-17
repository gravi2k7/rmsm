"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@rmsm/ui";
import { Stepper } from "@/features/market-data-shared/components/stepper";
import { useProviders } from "@/features/market-data-providers/hooks/use-providers";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import { useImportHistoricalCandles } from "@/features/market-data-import-jobs/hooks/use-import-jobs";
import { CANDLE_INTERVALS } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

const STEPS = ["Provider", "Instrument", "Timeframe & Range", "Review"];

export function ImportWizard() {
  const [step, setStep] = useState(0);
  const [providerConfigId, setProviderConfigId] = useState("");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [interval, setInterval] =
    useState<(typeof CANDLE_INTERVALS)[number]>("ONE_DAY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const providers = useProviders();

  const instruments = useInstruments({
    query: instrumentSearch,
    page: 1,
    pageSize: 50,
  });

  const importHistoricalCandles = useImportHistoricalCandles();

  const provider = providers.data?.find(
    (p) => p.id === providerConfigId,
  );

  const instrument = instruments.data?.data.find(
    (i) => i.id === instrumentId,
  );

  const canProceed = [
    !!providerConfigId,
    !!instrumentId,
    !!from && !!to,
    true,
  ][step];

  async function handleSubmit() {
    try {
      const job = await importHistoricalCandles.mutateAsync({
        instrumentId,
        providerConfigId,
        interval,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      });

      setCreatedJobId(job.id);
      toast.success("Historical import completed.");
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? e.message
          : "Failed to import historical candles.",
      );
    }
  }

  if (createdJobId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <CheckCircle2
            className="h-10 w-10 text-success"
            aria-hidden="true"
          />

          <div>
            <p className="font-medium">Historical import completed</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Import job <code>{createdJobId}</code> completed through the
              historical synchronization service. You can review its status
              and processed records on the Import Jobs page.
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <Link href="/market-data/import-jobs">
                View Import Jobs
              </Link>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCreatedJobId(null);
                setStep(0);
                setProviderConfigId("");
                setInstrumentSearch("");
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

            <Select
              value={providerConfigId}
              onValueChange={setProviderConfigId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    providers.isLoading
                      ? "Loading…"
                      : "Select a provider"
                  }
                />
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

            <Input
              placeholder="Search symbol or instrument name…"
              value={instrumentSearch}
              onChange={(e) => {
                setInstrumentSearch(e.target.value);
                setInstrumentId("");
              }}
            />

            <Select
              value={instrumentId}
              onValueChange={setInstrumentId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    instruments.isLoading
                      ? "Loading…"
                      : "Select an instrument"
                  }
                />
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
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Timeframe</Label>

              <Select
                value={interval}
                onValueChange={(v) =>
                  setInterval(
                    v as (typeof CANDLE_INTERVALS)[number],
                  )
                }
              >
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

                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="to">To</Label>

                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provider</dt>
                <dd>{provider?.name ?? "—"}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-muted-foreground">Instrument</dt>
                <dd>
                  {instrument
                    ? `${instrument.symbol} — ${instrument.name}`
                    : "—"}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-muted-foreground">Timeframe</dt>
                <dd>{interval.replaceAll("_", " ")}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-muted-foreground">Range</dt>
                <dd>
                  {from} → {to}
                </dd>
              </div>
            </dl>

            {importHistoricalCandles.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {importHistoricalCandles.error instanceof ApiError
                    ? importHistoricalCandles.error.message
                    : "Failed to import historical candles."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() =>
              setStep((s) => Math.max(0, s - 1))
            }
            disabled={step === 0}
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={importHistoricalCandles.isPending}
            >
              {importHistoricalCandles.isPending
                ? "Importing…"
                : "Import Historical Data"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
