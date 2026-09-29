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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rmsm/ui";
import {
  Plus,
  RotateCcw,
  Wallet,
} from "lucide-react";

import type { TradingAccount } from "../types";

export interface PortfolioAccountMetrics {
  accountId: string;
  balance?: number;
  equity?: number;
  availableCash?: number;
  marginUsed: number;
  marginLevel?: number;
  leverage?: number;
  unrealizedPnl: number;
}

interface PortfolioTradingAccountsProps {
  accounts: TradingAccount[];
  accountMetrics: ReadonlyMap<string, PortfolioAccountMetrics>;
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

  onUpdateLeverage: (
    account: TradingAccount,
    leverage: number,
  ) => Promise<void>;

  isCreating?: boolean;
  creatingError?: string | null;

  isAddingFunds?: boolean;
  addingFundsAccountId?: string | null;

  isResetting?: boolean;
  resettingAccountId?: string | null;

  isUpdatingLeverage?: boolean;
  updatingLeverageAccountId?: string | null;
  leverageError?: string | null;
}

function formatMoney(
  value: string | number | null | undefined,
  currency = "USD",
) {
  if (value == null) return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

export function PortfolioTradingAccounts({
  accounts,
  accountMetrics,
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
  onUpdateLeverage,
  isUpdatingLeverage = false,
  updatingLeverageAccountId,
  leverageError,
}: PortfolioTradingAccountsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("RMSM Demo");
  const [startingBalance, setStartingBalance] = useState("100000");
  const [fundValues, setFundValues] = useState<Record<string, string>>({});
  const [editingLeverageAccountId, setEditingLeverageAccountId] =
    useState<string | null>(null);
  const [leverageValues, setLeverageValues] =
    useState<Record<string, string>>({});

  function submitCreate() {
    const balance = Number(startingBalance.trim());

    if (!name.trim() || !Number.isFinite(balance) || balance <= 0) {
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
      <CardHeader className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="min-w-0">
          <CardTitle className="text-sm sm:text-base">
            Trading Accounts
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Account balances, margin and execution configuration.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setShowCreate((value) => !value)}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Create SIM
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 px-3 pb-3 sm:px-6 sm:pb-6">
        {(errorMessage || creatingError || leverageError) && (
          <Alert variant="destructive">
            <AlertDescription>
              {leverageError ?? creatingError ?? errorMessage}
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
                  onChange={(event) => setName(event.target.value)}
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
                  onChange={(event) => setStartingBalance(event.target.value)}
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
                  {isCreating ? "Creating…" : "Create"}
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
              Create a SIM account here before using Market → Trade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead className="text-right">Available Cash</TableHead>
                  <TableHead className="text-right">Margin Used</TableHead>
                  <TableHead className="text-right">Margin Level</TableHead>
                  <TableHead className="text-right">Leverage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {accounts.map((account) => {
                  const fundValue = fundValues[account.id] ?? "";
                  const metrics = accountMetrics.get(account.id);

                  const busyAdd =
                    isAddingFunds && addingFundsAccountId === account.id;

                  const busyReset =
                    isResetting && resettingAccountId === account.id;

                  return (
                    <TableRow key={account.id}>
                      <TableCell className="min-w-[180px]">
                        <div className="font-medium">{account.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.type === "DEMO" ? "SIM" : account.type} ·{" "}
                          {account.currency}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {account.brokerConnectionId
                            ? "Connected"
                            : account.type === "DEMO"
                              ? "SIM"
                              : "—"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            account.status === "ACTIVE"
                              ? "success"
                              : "outline"
                          }
                        >
                          {account.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatMoney(
                          metrics?.balance,
                          account.currency,
                        )}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatMoney(
                          metrics?.equity,
                          account.currency,
                        )}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatMoney(
                          metrics?.availableCash,
                          account.currency,
                        )}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatMoney(
                          metrics?.marginUsed,
                          account.currency,
                        )}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {metrics?.marginLevel !== undefined
                          ? `${metrics.marginLevel.toFixed(2)}%`
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {account.type === "DEMO" &&
                        editingLeverageAccountId === account.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              aria-label={`Leverage for ${account.name}`}
                              inputMode="decimal"
                              min={1}
                              step="0.01"
                              value={
                                leverageValues[account.id] ??
                                String(metrics?.leverage ?? account.leverage)
                              }
                              onChange={(event) =>
                                setLeverageValues((current) => ({
                                  ...current,
                                  [account.id]: event.target.value,
                                }))
                              }
                              className="h-8 w-20 text-right"
                              disabled={
                                isUpdatingLeverage &&
                                updatingLeverageAccountId === account.id
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-2"
                              disabled={
                                isUpdatingLeverage &&
                                updatingLeverageAccountId === account.id
                              }
                              onClick={() => {
                                const value = Number(
                                  (
                                    leverageValues[account.id] ??
                                    String(
                                      metrics?.leverage ??
                                        account.leverage,
                                    )
                                  ).trim(),
                                );

                                if (!Number.isFinite(value) || value < 1) {
                                  return;
                                }

                                void onUpdateLeverage(account, value).then(() => {
                                  setEditingLeverageAccountId(null);
                                  setLeverageValues((current) => {
                                    const next = { ...current };
                                    delete next[account.id];
                                    return next;
                                  });
                                });
                              }}
                            >
                              {isUpdatingLeverage &&
                              updatingLeverageAccountId === account.id
                                ? "…"
                                : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              disabled={
                                isUpdatingLeverage &&
                                updatingLeverageAccountId === account.id
                              }
                              onClick={() => {
                                setEditingLeverageAccountId(null);
                                setLeverageValues((current) => {
                                  const next = { ...current };
                                  delete next[account.id];
                                  return next;
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 font-normal tabular-nums"
                            disabled={
                              account.type !== "DEMO" ||
                              account.status !== "ACTIVE" ||
                              isUpdatingLeverage
                            }
                            onClick={() => {
                              setLeverageValues((current) => ({
                                ...current,
                                [account.id]: String(
                                  metrics?.leverage ??
                                    account.leverage,
                                ),
                              }));
                              setEditingLeverageAccountId(account.id);
                            }}
                          >
                            {metrics?.leverage !== undefined
                              ? `${metrics.leverage}×`
                              : "—"}
                          </Button>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex min-w-[250px] items-center justify-end gap-2">
                          <Input
                            aria-label={`Add funds to ${account.name}`}
                            inputMode="decimal"
                            value={fundValue}
                            onChange={(event) =>
                              setFundValues((current) => ({
                                ...current,
                                [account.id]: event.target.value,
                              }))
                            }
                            placeholder="Amount"
                            className="h-8 w-24"
                          />

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyAdd || !fundValue.trim()}
                            onClick={() => {
                              const amount = Number(fundValue.trim());

                              if (
                                Number.isFinite(amount) &&
                                amount > 0
                              ) {
                                onAddFunds(account, amount);

                                setFundValues((current) => ({
                                  ...current,
                                  [account.id]: "",
                                }));
                              }
                            }}
                          >
                            {busyAdd ? "Adding…" : "Add Funds"}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              busyReset || account.type !== "DEMO"
                            }
                            onClick={() => onReset(account)}
                          >
                            <RotateCcw
                              className="mr-1.5 h-4 w-4"
                              aria-hidden="true"
                            />
                            {busyReset ? "Resetting…" : "Reset"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
