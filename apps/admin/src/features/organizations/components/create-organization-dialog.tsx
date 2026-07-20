"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertCircle } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Alert, AlertDescription } from "@rmsm/ui";
import { useCreateOrganization } from "../hooks/use-organizations";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(200),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters.")
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and single hyphens only."),
  description: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const createOrganization = useCreateOrganization();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await createOrganization.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        New Organization
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>

        {createOrganization.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{createOrganization.error instanceof ApiError ? createOrganization.error.message : "Failed to create organization."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="acme-trading-desk" {...register("slug")} aria-invalid={!!errors.slug} />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOrganization.isPending}>
              {createOrganization.isPending ? "Creating…" : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
