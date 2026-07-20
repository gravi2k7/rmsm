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
import { ORDER_SIDES, ORDER_TYPES } from "../types";
import { useCreateOrder } from "../hooks/use-execution";
import { ApiError } from "@/lib/api-client";

const schema = z
  .object({
    decisionId: z.string().uuid("Must be a valid decision id (UUID)."),
    symbolCode: z.string().min(1, "Symbol is required."),
    side: z.enum(ORDER_SIDES),
    type: z.enum(ORDER_TYPES),
    quantityUnits: z.coerce.number().positive(),
    limitPrice: z.coerce.number().optional(),
    stopPrice: z.coerce.number().optional(),
    pricePrecision: z.coerce.number().int().min(0).default(5),
  })
  .refine((v) => !(v.type === "LIMIT" || v.type === "STOP_LIMIT") || v.limitPrice !== undefined, {
    message: "Limit price is required for LIMIT/STOP_LIMIT orders.",
    path: ["limitPrice"],
  })
  .refine((v) => !(v.type === "STOP" || v.type === "STOP_LIMIT") || v.stopPrice !== undefined, {
    message: "Stop price is required for STOP/STOP_LIMIT orders.",
    path: ["stopPrice"],
  });

type FormValues = z.infer<typeof schema>;

/** `defaultDecisionId`/`defaultSymbolCode` let callers (e.g. the Decision
 * Center's own "Create Order" quick action) pre-fill this form from an
 * already-approved decision, rather than requiring the trader to
 * re-type an id they just had on screen. */
export function CreateOrderDialog({
  open,
  onOpenChange,
  defaultDecisionId,
  defaultSymbolCode,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDecisionId?: string;
  defaultSymbolCode?: string;
  trigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const createOrder = useCreateOrder();
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { side: "BUY", type: "MARKET", pricePrecision: 5, decisionId: defaultDecisionId ?? "", symbolCode: defaultSymbolCode ?? "" },
  });

  const type = watch("type");

  async function onSubmit(values: FormValues) {
    await createOrder.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger !== false && (
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Place Order
        </Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Place Order</DialogTitle>
          <DialogDescription>Submits an order for an already-approved decision.</DialogDescription>
        </DialogHeader>

        {createOrder.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{createOrder.error instanceof ApiError ? createOrder.error.message : "Failed to place order."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="decisionId">Decision ID</Label>
            <Input id="decisionId" placeholder="Approved decision UUID" {...register("decisionId")} aria-invalid={!!errors.decisionId} />
            {errors.decisionId && <p className="text-sm text-destructive">{errors.decisionId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbolCode">Symbol</Label>
              <Input id="symbolCode" placeholder="EURUSD" {...register("symbolCode")} aria-invalid={!!errors.symbolCode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantityUnits">Quantity</Label>
              <Input id="quantityUnits" type="number" {...register("quantityUnits")} aria-invalid={!!errors.quantityUnits} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="side">Side</Label>
              <Controller
                control={control}
                name="side"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="side">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_SIDES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Order Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {(type === "LIMIT" || type === "STOP_LIMIT") && (
            <div className="space-y-2">
              <Label htmlFor="limitPrice">Limit Price</Label>
              <Input id="limitPrice" type="number" step="any" {...register("limitPrice")} aria-invalid={!!errors.limitPrice} />
              {errors.limitPrice && <p className="text-sm text-destructive">{errors.limitPrice.message}</p>}
            </div>
          )}

          {(type === "STOP" || type === "STOP_LIMIT") && (
            <div className="space-y-2">
              <Label htmlFor="stopPrice">Stop Price</Label>
              <Input id="stopPrice" type="number" step="any" {...register("stopPrice")} aria-invalid={!!errors.stopPrice} />
              {errors.stopPrice && <p className="text-sm text-destructive">{errors.stopPrice.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending ? "Placing…" : "Place Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
