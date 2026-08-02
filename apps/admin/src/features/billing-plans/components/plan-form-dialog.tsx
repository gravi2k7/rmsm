"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, AlertCircle } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Switch, Alert, AlertDescription } from "@rmsm/ui";
import { useCreatePlan, useUpdatePlan } from "../hooks/use-plans";
import { ApiError } from "@/lib/api-client";
import type { SubscriptionPlan } from "../types";

const createSchema = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only."),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  monthlyPriceCents: z.coerce.number().int().min(0),
  yearlyPriceCents: z.coerce.number().int().min(0),
  trialDays: z.coerce.number().int().min(0).optional(),
  gracePeriodDays: z.coerce.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

type FormValues = z.infer<typeof createSchema>;

/** Also used for "Clone": pass `cloneFrom` to prefill a *new* plan's form
 * with another plan's values (no clone endpoint exists — this reproduces
 * it client-side as a prefilled create, per the milestone's
 * "no new APIs" constraint). */
export function PlanFormDialog({ plan, cloneFrom }: { plan?: SubscriptionPlan; cloneFrom?: SubscriptionPlan }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!plan;
  const source = plan ?? cloneFrom;
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan(plan?.id ?? "");
  const mutation = isEdit ? updatePlan : createPlan;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? createSchema.omit({ key: true }).extend({ key: z.string().optional() }) : createSchema),
    defaultValues: source
      ? {
          key: isEdit ? source.key : `${source.key}_copy`,
          name: isEdit ? source.name : `${source.name} (Copy)`,
          description: source.description ?? undefined,
          monthlyPriceCents: source.monthlyPriceCents,
          yearlyPriceCents: source.yearlyPriceCents,
          trialDays: source.trialDays,
          gracePeriodDays: source.gracePeriodDays,
          isVisible: source.isVisible,
        }
      : { isVisible: true, trialDays: 0, gracePeriodDays: 0 },
  });

  useEffect(() => {
    if (open && source) {
      reset({
        key: isEdit ? source.key : `${source.key}_copy`,
        name: isEdit ? source.name : `${source.name} (Copy)`,
        description: source.description ?? undefined,
        monthlyPriceCents: source.monthlyPriceCents,
        yearlyPriceCents: source.yearlyPriceCents,
        trialDays: source.trialDays,
        gracePeriodDays: source.gracePeriodDays,
        isVisible: source.isVisible,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      await updatePlan.mutateAsync(values);
    } else {
      await createPlan.mutateAsync({ ...values, key: values.key! });
    }
    setOpen(false);
  }

  const isVisible = watch("isVisible");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} onClick={() => setOpen(true)}>
        {isEdit ? <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
        {isEdit ? "Edit" : cloneFrom ? "Clone" : "New Plan"}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${plan.name}` : cloneFrom ? `Clone ${cloneFrom.name}` : "Create Plan"}</DialogTitle>
        </DialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{mutation.error instanceof ApiError ? mutation.error.message : "Failed to save plan."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" placeholder="professional" {...register("key")} aria-invalid={!!errors.key} />
              {errors.key && <p className="text-sm text-destructive">{errors.key.message}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyPriceCents">Monthly Price (cents)</Label>
              <Input id="monthlyPriceCents" type="number" min={0} {...register("monthlyPriceCents")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearlyPriceCents">Yearly Price (cents)</Label>
              <Input id="yearlyPriceCents" type="number" min={0} {...register("yearlyPriceCents")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Days</Label>
              <Input id="trialDays" type="number" min={0} {...register("trialDays")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gracePeriodDays">Grace Period (days)</Label>
              <Input id="gracePeriodDays" type="number" min={0} {...register("gracePeriodDays")} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Visible to customers</p>
              <p className="text-xs text-muted-foreground">Hidden plans (Status: Archived) stay usable for existing subscribers.</p>
            </div>
            <Switch checked={isVisible ?? true} onCheckedChange={(v) => setValue("isVisible", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
