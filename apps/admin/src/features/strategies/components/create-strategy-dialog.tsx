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

import { useCreateStrategy } from "../hooks/use-strategies";
import { ApiError } from "@/lib/api-client";

const CATEGORY_VALUES = [
  "TREND_FOLLOWING",
  "MEAN_REVERSION",
  "MOMENTUM",
  "BREAKOUT",
  "SCALPING",
  "SWING",
  "ARBITRAGE",
  "MARKET_MAKING",
  "CUSTOM",
] as const;

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(200, "Name must be 200 characters or less."),

  description: z
    .string()
    .min(1, "Description is required."),

  category: z.enum(CATEGORY_VALUES),
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
    defaultValues: {
      name: "",
      description: "",
      category: "CUSTOM",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createStrategy.mutateAsync(values);

      reset();
      setOpen(false);
    } catch {
      // Mutation error is displayed by the Alert below.
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!createStrategy.isPending) {
      setOpen(nextOpen);

      if (!nextOpen) {
        reset();
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Button
        onClick={() => setOpen(true)}
        disabled={createStrategy.isPending}
      >
        <Plus
          className="mr-2 h-4 w-4"
          aria-hidden="true"
        />
        New Strategy
      </Button>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Create Strategy
          </DialogTitle>

          <DialogDescription>
            Create a strategy definition. Strategy versions,
            rules, and parameters are managed separately.
          </DialogDescription>
        </DialogHeader>

        {createStrategy.isError && (
          <Alert variant="destructive">
            <AlertCircle
              className="h-4 w-4"
              aria-hidden="true"
            />

            <AlertDescription>
              {createStrategy.error instanceof ApiError
                ? createStrategy.error.message
                : "Failed to create strategy."}
            </AlertDescription>
          </Alert>
        )}

        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="strategy-name">
              Name
            </Label>

            <Input
              id="strategy-name"
              {...register("name")}
              aria-invalid={!!errors.name}
              disabled={createStrategy.isPending}
            />

            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy-description">
              Description
            </Label>

            <Input
              id="strategy-description"
              {...register("description")}
              aria-invalid={!!errors.description}
              disabled={createStrategy.isPending}
            />

            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy-category">
              Category
            </Label>

            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={createStrategy.isPending}
                >
                  <SelectTrigger id="strategy-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORY_VALUES.map((category) => (
                      <SelectItem
                        key={category}
                        value={category}
                      >
                        {category.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {errors.category && (
              <p className="text-sm text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createStrategy.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={createStrategy.isPending}
            >
              {createStrategy.isPending
                ? "Creating…"
                : "Create Strategy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
