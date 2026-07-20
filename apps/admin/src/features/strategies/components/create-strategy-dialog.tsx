"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertCircle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
} from "@rmsm/ui";
import { RISK_TOLERANCES, TIMEFRAMES } from "../types";
import { useCreateStrategy } from "../hooks/use-strategies";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Name is required.").max(200),
  description: z.string().min(1, "Description is required.").max(2000),
  riskTolerance: z.enum(RISK_TOLERANCES),
  maxRiskPerTrade: z.coerce.number().min(0.0001).max(1),
  maxLeverage: z.coerce.number().positive(),
  maxOpenPositions: z.coerce.number().int().positive(),
  timeframe: z.enum(TIMEFRAMES),
  supportedSymbols: z.string().min(1, "Enter at least one symbol."),
});

type FormValues = z.infer<typeof schema>;

export function CreateStrategyDialog() {
  const [open, setOpen] = useState(false);
  const createStrategy = useCreateStrategy();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { riskTolerance: "MEDIUM", timeframe: "1h", maxRiskPerTrade: 0.02, maxLeverage: 10, maxOpenPositions: 5 },
  });

  async function onSubmit(values: FormValues) {
    await createStrategy.mutateAsync({
      ...values,
      supportedSymbols: values.supportedSymbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        New Strategy
      </Button>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Strategy</DialogTitle>
          <DialogDescription>New strategies start in DRAFT status, disabled.</DialogDescription>
        </DialogHeader>

        {createStrategy.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{createStrategy.error instanceof ApiError ? createStrategy.error.message : "Failed to create strategy."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} aria-invalid={!!errors.description} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="riskTolerance">Risk Tolerance</Label>
              <Controller
                control={control}
                name="riskTolerance"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="riskTolerance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_TOLERANCES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Controller
                control={control}
                name="timeframe"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="timeframe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxRiskPerTrade">Max Risk / Trade</Label>
              <Input id="maxRiskPerTrade" type="number" step="0.001" {...register("maxRiskPerTrade")} aria-invalid={!!errors.maxRiskPerTrade} />
              {errors.maxRiskPerTrade && <p className="text-sm text-destructive">{errors.maxRiskPerTrade.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLeverage">Max Leverage</Label>
              <Input id="maxLeverage" type="number" {...register("maxLeverage")} aria-invalid={!!errors.maxLeverage} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxOpenPositions">Max Positions</Label>
              <Input id="maxOpenPositions" type="number" {...register("maxOpenPositions")} aria-invalid={!!errors.maxOpenPositions} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportedSymbols">Supported Symbols</Label>
            <Input id="supportedSymbols" placeholder="EURUSD, GBPUSD" {...register("supportedSymbols")} aria-invalid={!!errors.supportedSymbols} />
            <p className="text-xs text-muted-foreground">Comma-separated symbol codes.</p>
            {errors.supportedSymbols && <p className="text-sm text-destructive">{errors.supportedSymbols.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStrategy.isPending}>
              {createStrategy.isPending ? "Creating…" : "Create Strategy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
