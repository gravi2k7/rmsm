"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@rmsm/ui";
import { SessionGate } from "@/components/ui-extra/session-gate";
import { useCreateStrategy } from "@/hooks/use-strategies";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { STRATEGY_CATEGORIES } from "@/types/strategy";

const schema = z.object({
  name: z.string().min(1, "Name is required.").max(200, "Name must be at most 200 characters."),
  description: z.string().min(1, "Description is required."),
  category: z.enum(STRATEGY_CATEGORIES as [string, ...string[]], { required_error: "Choose a category." }),
});

type FormValues = z.infer<typeof schema>;

function CreateStrategyForm() {
  const router = useRouter();
  const createStrategy = useCreateStrategy();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", category: "CUSTOM" },
  });

  useUnsavedChangesWarning(isDirty && !createStrategy.isSuccess);

  function onSubmit(values: FormValues) {
    createStrategy.mutate(
      { name: values.name, description: values.description, category: values.category as FormValues["category"] & (typeof STRATEGY_CATEGORIES)[number] },
      {
        onSuccess: (strategy) => {
          toast.success(`Strategy "${strategy.name}" created.`);
          router.push(`/strategies/${strategy.id}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create strategy."),
      },
    );
  }

  const category = watch("category");

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
            {errors.name && (
              <p id="name-error" role="alert" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} aria-invalid={!!errors.description} aria-describedby={errors.description ? "description-error" : undefined} />
            {errors.description && (
              <p id="description-error" role="alert" className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setValue("category", v as FormValues["category"], { shouldDirty: true })}>
              <SelectTrigger id="category" aria-invalid={!!errors.category}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p role="alert" className="text-sm text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/strategies/list")}>
              Cancel
            </Button>
            <Button type="submit" loading={createStrategy.isPending}>
              Create Strategy
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function CreateStrategyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Strategy</h1>
      <SessionGate>
        <CreateStrategyForm />
      </SessionGate>
    </div>
  );
}
