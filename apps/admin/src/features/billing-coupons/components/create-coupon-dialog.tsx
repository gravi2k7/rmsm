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
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Alert,
  AlertDescription,
} from "@rmsm/ui";
import { useCreateCoupon } from "../hooks/use-coupons";
import { ApiError } from "@/lib/api-client";
import { COUPON_TYPES_DTO } from "@/features/billing-shared/types";

const schema = z.object({
  code: z.string().min(3).max(50),
  type: z.enum(COUPON_TYPES_DTO),
  value: z.coerce.number(),
  currency: z.string().optional(),
  expiresAt: z.string().optional(),
  maxRedemptions: z.coerce.number().int().min(1).optional(),
  isPublic: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateCouponDialog() {
  const [open, setOpen] = useState(false);
  const createCoupon = useCreateCoupon();
  const { register, control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "PERCENTAGE", isPublic: true },
  });

  async function onSubmit(values: FormValues) {
    await createCoupon.mutateAsync({
      code: values.code,
      type: values.type,
      value: values.value,
      currency: values.currency,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      maxRedemptions: values.maxRedemptions,
      isPublic: values.isPublic,
    });
    reset();
    setOpen(false);
  }

  const isPublic = watch("isPublic");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        New Coupon
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Coupon</DialogTitle>
        </DialogHeader>

        {createCoupon.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{createCoupon.error instanceof ApiError ? createCoupon.error.message : "Failed to create coupon."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="SAVE20" {...register("code")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUPON_TYPES_DTO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "FIXED" ? "Fixed Amount" : "Percentage"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Discount Value</Label>
              <Input id="value" type="number" {...register("value")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration</Label>
            <Input id="expiresAt" type="date" {...register("expiresAt")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxRedemptions">Usage Limit (blank = unlimited)</Label>
            <Input id="maxRedemptions" type="number" min={1} {...register("maxRedemptions")} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Public coupon</p>
              <p className="text-xs text-muted-foreground">Usable by any organization, not restricted to one.</p>
            </div>
            <Switch checked={isPublic ?? true} onCheckedChange={(v) => setValue("isPublic", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCoupon.isPending}>
              {createCoupon.isPending ? "Creating…" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
