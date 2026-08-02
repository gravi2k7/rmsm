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
  Alert,
  AlertDescription,
} from "@rmsm/ui";
import { useIssueLicense } from "../hooks/use-licenses";
import { ApiError } from "@/lib/api-client";
import { LICENSE_TYPES } from "@/features/billing-shared/types";

const schema = z.object({
  type: z.enum(LICENSE_TYPES),
  seats: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function IssueLicenseDialog() {
  const [open, setOpen] = useState(false);
  const issueLicense = useIssueLicense();
  const { register, control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "ENTERPRISE" },
  });

  async function onSubmit(values: FormValues) {
    await issueLicense.mutateAsync({
      type: values.type,
      seats: values.seats,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      notes: values.notes,
    });
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Issue License
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue License</DialogTitle>
        </DialogHeader>

        {issueLicense.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{issueLicense.error instanceof ApiError ? issueLicense.error.message : "Failed to issue license."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    {LICENSE_TYPES.map((t) => (
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
            <Label htmlFor="seats">Seats (blank = unlimited)</Label>
            <Input id="seats" type="number" min={1} {...register("seats")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expires</Label>
            <Input id="expiresAt" type="date" {...register("expiresAt")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={issueLicense.isPending}>
              {issueLicense.isPending ? "Issuing…" : "Issue License"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
