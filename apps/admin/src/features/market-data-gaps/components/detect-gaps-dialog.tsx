"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
  Button, Label, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, toast,
} from "@rmsm/ui";
import { useInstruments } from "@/features/market-data-instruments/hooks/use-instruments";
import { useDetectGaps } from "../hooks/use-gaps";
import { CANDLE_INTERVALS } from "@/features/market-data-shared/types";
import { ApiError } from "@/lib/api-client";

export function DetectGapsDialog() {
  const [open, setOpen] = useState(false);
  const [instrumentId, setInstrumentId] = useState("");
  const [interval, setInterval] = useState<(typeof CANDLE_INTERVALS)[number]>("ONE_DAY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [respectWeekends, setRespectWeekends] = useState(true);

  const instruments = useInstruments();
  const detectGaps = useDetectGaps();

  async function handleSubmit() {
    try {
      const gaps = await detectGaps.mutateAsync({
        instrumentId,
        interval,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        respectWeekends,
      });
      toast.success(`Scan complete — ${gaps.length} new gap${gaps.length === 1 ? "" : "s"} detected.`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to run gap detection.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Detect Gaps
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan for Data Gaps</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
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
              <Label htmlFor="gap-from">From</Label>
              <Input id="gap-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gap-to">To</Label>
              <Input id="gap-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Respect weekends</p>
              <p className="text-xs text-muted-foreground">Don&apos;t flag weekend candles as missing.</p>
            </div>
            <Switch checked={respectWeekends} onCheckedChange={setRespectWeekends} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!instrumentId || !from || !to || detectGaps.isPending}>
            {detectGaps.isPending ? "Scanning…" : "Run Scan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
