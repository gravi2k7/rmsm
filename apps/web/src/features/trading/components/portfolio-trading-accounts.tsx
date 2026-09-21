"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@rmsm/ui";
import {
  Plus,
  RotateCcw,
  Wallet,
} from "lucide-react";

import type { TradingAccount } from "../types";

interface PortfolioTradingAccountsProps {
  accounts: TradingAccount[];
  isLoading: boolean;
  errorMessage?: string | null;

  onCreate: (input: {
    name: string;
    currency: string;
    startingBalance: number;
    leverage?: number;
  }) => void;

  onAddFunds: (
    account: TradingAccount,
    amount: number,
  ) => void;

  onReset: (
    account: TradingAccount,
  ) => void;

  isCreating?: boolean;
  creatingError?: string | null;

  isAddingFunds?: boolean;
  addingFundsAccountId?: string | null;

  isResetting?: boolean;
  resettingAccountId?: string | null;
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

export function PortfolioTradingAccounts({
  accounts,
  isLoading,
  errorMessage,
  onCreate,
  onAddFunds,
  onReset,
  isCreating = false,
  creatingError,
  isAddingFunds = false,
  addingFundsAccountId,
  isResetting = false,
  resettingAccountId,
}: PortfolioTradingAccountsProps) {
  const [showCreate, setShowCreate] =
    useState(false);

  const [name, setName] =
    useState("RMSM Demo");

  const [startingBalance, setStartingBalance] =
    useState("100000");

  const [fundValues, setFundValues] =
    useState<Record<string, string>>({});

  function submitCreate() {
    const balance = Number(
      startingBalance.trim(),
    );

    if (
      !name.trim() ||
      !Number.isFinite(balance) ||
      balance <= 0
    ) {
      return;
    }

    onCreate({
      name: name.trim(),
      currency: "USD",
      startingBalance: balance,
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <CardTitle className="text-sm sm:text-base">
            Trading Accounts
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Demo accounts available to the trading workspace.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() =>
            setShowCreate((value) => !value)
          }
        >
          <Plus
            className="mr-1.5 h-4 w-4"
            aria-hidden="true"
          />
          Create Demo
        </Button>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3 sm:space-y-4 sm:px-6 sm:pb-6">
        {(errorMessage || creatingError) && (
          <Alert variant="destructive">
            <AlertDescription>
              {creatingError ?? errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {showCreate && (
          <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:gap-4">
              <div>
                <label
                  htmlFor="portfolio-demo-name"
                  className="mb-1 block text-xs font-medium"
                >
                  Account name
                </label>
                <Input
                  id="portfolio-demo-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="h-9"
                />
              </div>

              <div>
                <label
                  htmlFor="portfolio-demo-balance"
                  className="mb-1 block text-xs font-medium"
                >
                  Starting balance
                </label>
                <Input
                  id="portfolio-demo-balance"
                  inputMode="decimal"
                  value={startingBalance}
                  onChange={(event) =>
                    setStartingBalance(
                      event.target.value,
                    )
                  }
                  className="h-9"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  className="h-9 w-full md:w-auto"
                  disabled={
                    isCreating ||
                    !name.trim() ||
                    !startingBalance.trim()
                  }
                  onClick={submitCreate}
                >
                  {isCreating
                    ? "Creating…"
                    : "Create"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Wallet
              className="mx-auto h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="mt-2 text-sm font-medium">
              No trading accounts
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a Demo account here before using Market → Trade.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const fundValue =
                fundValues[account.id] ?? "";

              const busyAdd =
                isAddingFunds &&
                addingFundsAccountId === account.id;

              const busyReset =
                isResetting &&
                resettingAccountId === account.id;

              return (
                <div
                  key={account.id}
                  className="rounded-lg border"
                >
                  <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">
                          {account.name}
                        </div>

                        <Badge variant="success">
                          {account.status}
                        </Badge>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {account.type} · {account.currency}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-muted-foreground">
                        Balance
                      </div>
                      <div className="text-lg font-semibold tabular-nums">
                        {formatMoney(
                          account.balance,
                          account.currency,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-4">
                    <div>
                      <label
                        htmlFor={`fund-${account.id}`}
                        className="mb-1 block text-xs font-medium"
                      >
                        Add virtual funds
                      </label>

                      <Input
                        id={`fund-${account.id}`}
                        inputMode="decimal"
                        value={fundValue}
                        onChange={(event) =>
                          setFundValues(
                            (current) => ({
                              ...current,
                              [account.id]:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="10000"
                        className="h-9"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="self-end"
                      disabled={
                        busyAdd ||
                        !fundValue.trim()
                      }
                      onClick={() => {
                        const amount = Number(
                          fundValue.trim(),
                        );

                        if (
                          Number.isFinite(amount) &&
                          amount > 0
                        ) {
                          onAddFunds(
                            account,
                            amount,
                          );

                          setFundValues(
                            (current) => ({
                              ...current,
                              [account.id]: "",
                            }),
                          );
                        }
                      }}
                    >
                      {busyAdd
                        ? "Adding…"
                        : "Add Funds"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="self-end"
                      disabled={
                        busyReset ||
                        account.type !== "DEMO"
                      }
                      onClick={() =>
                        onReset(account)
                      }
                    >
                      <RotateCcw
                        className="mr-1.5 h-4 w-4"
                        aria-hidden="true"
                      />
                      {busyReset
                        ? "Resetting…"
                        : "Reset"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
