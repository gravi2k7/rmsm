"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@rmsm/ui";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import { useImportHistoricalCandles } from "@/features/market-data-import-jobs/hooks/use-import-jobs";
import { CANDLE_INTERVALS } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";
import type { ProviderConfig } from "@/features/market-data-shared/types";

/**
 * Quick provider synchronization.
 *
 * The provider configuration is supplied by the Providers page.
 * The mutating API surface is the existing historical synchronization
 * endpoint:
 *
 * POST /market-data/synchronizations/import
 *
 * This imports the selected instrument for the most recent 24-hour range.
 * Full historical ranges remain available through the Historical Import
 * wizard.
 */
export function QuickSyncDialog({
  provider,
}: {
  provider: ProviderConfig;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [interval, setInterval] =
    useState<(typeof CANDLE_INTERVALS)[number]>("ONE_DAY");

  const instruments = useInstruments();

  const filteredInstruments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const all = instruments.data?.data ?? [];

    if (!needle) return all;

    return all.filter(
      (i) =>
        i.symbol.toLowerCase().includes(needle) ||
        i.name.toLowerCase().includes(needle),
    );
  }, [instruments.data, search]);

  const importHistoricalCandles = useImportHistoricalCandles();

  async function handleSync() {
    if (!instrumentId) return;

    const now = new Date();
    const yesterday = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    );

    try {
      const job = await importHistoricalCandles.mutateAsync({
        instrumentId,
        providerConfigId: provider.id,
        interval,
        from: yesterday.toISOString(),
        to: now.toISOString(),
      });

      toast.success(
        `Synchronization completed — import job ${job.id}.`,
      );

      setOpen(false);
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? e.message
          : "Failed to synchronize market data.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <RefreshCw
          className="mr-2 h-3.5 w-3.5"
          aria-hidden="true"
        />
        Synchronize
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Synchronize via {provider.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instrument-search">
              Instrument
            </Label>

            <Input
              id="instrument-search"
              placeholder="Filter loaded instruments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                      : "Select instrument"
                  }
                />
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

          <div className="space-y-2">
            <Label htmlFor="interval">
              Timeframe
            </Label>

            <Select
              value={interval}
              onValueChange={(v) =>
                setInterval(
                  v as (typeof CANDLE_INTERVALS)[number],
                )
              }
            >
              <SelectTrigger id="interval">
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

          <p className="text-xs text-muted-foreground">
            Imports the last 24 hours through the selected provider.
            For a full historical range, use the Historical Import
            wizard.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSync}
            disabled={
              !instrumentId ||
              importHistoricalCandles.isPending
            }
          >
            {importHistoricalCandles.isPending
              ? "Synchronizing…"
              : "Synchronize"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
