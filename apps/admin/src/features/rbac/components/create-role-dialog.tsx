"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertCircle } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Alert, AlertDescription } from "@rmsm/ui";
import { useCreateRole } from "../hooks/use-rbac";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const createRole = useCreateRole();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await createRole.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        New Role
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
        </DialogHeader>

        {createRole.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{createRole.error instanceof ApiError ? createRole.error.message : "Failed to create role."}</AlertDescription>
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
            <Input id="description" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
