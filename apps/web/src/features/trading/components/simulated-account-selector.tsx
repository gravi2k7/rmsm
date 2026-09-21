"use client";

import { Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@rmsm/ui";

import type { TradingAccount } from "../types";

interface SimulatedAccountSelectorProps {
  accounts: TradingAccount[];
  value: string;
  onChange: (accountId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function formatMoney(
  value: string | null | undefined,
  currency = "USD",
) {
  if (value == null) return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return value;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

export function SimulatedAccountSelector({
  accounts,
  value,
  onChange,
  isLoading = false,
  disabled = false,
}: SimulatedAccountSelectorProps) {
  const selected = accounts.find(
    (account) => account.id === value,
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={
        disabled ||
        isLoading ||
        accounts.length === 0
      }
    >
      <SelectTrigger
        aria-label="Simulated trading account"
        className="h-9 w-[230px] shrink-0 border-0 bg-transparent px-2 shadow-none hover:bg-muted"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Wallet
            className="h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-xs font-medium">
              {selected?.name ??
                (isLoading
                  ? "Loading account…"
                  : "Select Demo account")}
            </div>

            {selected && (
              <div className="text-[10px] text-muted-foreground">
                {formatMoney(
                  selected.balance,
                  selected.currency,
                )}
              </div>
            )}
          </div>
        </div>

      </SelectTrigger>

      <SelectContent>
        {accounts.map((account) => (
          <SelectItem
            key={account.id}
            value={account.id}
          >
            <div className="flex min-w-[210px] items-center justify-between gap-4">
              <span>{account.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatMoney(
                  account.balance,
                  account.currency,
                )}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
