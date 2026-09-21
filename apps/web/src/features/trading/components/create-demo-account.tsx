"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
} from "@rmsm/ui";

interface CreateDemoAccountProps {
  onSubmit: (input: {
    name: string;
    currency: string;
    startingBalance: number;
    leverage: number;
  }) => void;
  onCancel?: () => void;
  isPending?: boolean;
  errorMessage?: string | null;
}

export function CreateDemoAccount({
  onSubmit,
  onCancel,
  isPending = false,
  errorMessage,
}: CreateDemoAccountProps) {
  const [name, setName] =
    useState("RMSM Demo");

  const [startingBalance, setStartingBalance] =
    useState("100000");

  const [leverage, setLeverage] =
    useState("10");

  function handleSubmit() {
    const balance = Number(
      startingBalance.trim(),
    );
    const leverageValue = Number(
      leverage.trim(),
    );

    if (
      !name.trim() ||
      !Number.isFinite(balance) ||
      balance <= 0 ||
      !Number.isFinite(leverageValue) ||
      leverageValue < 1
    ) {
      return;
    }

    onSubmit({
      name: name.trim(),
      currency: "USD",
      startingBalance: balance,
      leverage: leverageValue,
    });
  }

  return (
    <div className="w-[300px] rounded-xl border bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="text-xs text-muted-foreground">
        Paper Trading
      </div>

      <div className="mt-1 text-sm font-semibold">
        Create Demo Account
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label
            htmlFor="demo-account-name"
            className="mb-1 block text-xs font-medium"
          >
            Account name
          </label>

          <Input
            id="demo-account-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            className="h-9"
          />
        </div>

        <div>
          <label
            htmlFor="demo-account-balance"
            className="mb-1 block text-xs font-medium"
          >
            Starting balance
          </label>

          <Input
            id="demo-account-balance"
            inputMode="decimal"
            value={startingBalance}
            onChange={(event) =>
              setStartingBalance(
                event.target.value,
              )
            }
            className="h-9 tabular-nums"
          />
        </div>

        <div>
          <label
            htmlFor="demo-account-leverage"
            className="mb-1 block text-xs font-medium"
          >
            Leverage
          </label>

          <select
            id="demo-account-leverage"
            value={leverage}
            onChange={(event) =>
              setLeverage(event.target.value)
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="1">1x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
            <option value="20">20x</option>
            <option value="25">25x</option>
          </select>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Account-level leverage used for margin and buying power.
          </p>
        </div>

        {errorMessage && (
          <Alert
            variant="destructive"
            className="py-2"
          >
            <AlertDescription className="text-xs">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              isPending ||
              !name.trim() ||
              !startingBalance.trim()
            }
          >
            {isPending
              ? "Creating…"
              : "Create Demo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
