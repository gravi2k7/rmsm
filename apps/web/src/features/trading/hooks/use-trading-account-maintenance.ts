"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addTradingFunds,
  resetDemoTradingAccount,
  updateTradingAccountLeverage,
} from "../api/trading-api";

export function useTradingAccountMaintenance(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  const queryClient = useQueryClient();

  const accountKey = [
    "trading-account",
    organizationId,
    accountId,
  ];

  const accountsKey = [
    "trading-accounts",
    organizationId,
  ];

  const addFunds = useMutation({
    mutationFn: async (amount: number) => {
      if (!organizationId || !accountId) {
        throw new Error(
          "An active trading account is required.",
        );
      }

      return addTradingFunds(
        organizationId,
        accountId,
        amount,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: accountKey,
        }),
        queryClient.invalidateQueries({
          queryKey: accountsKey,
        }),
      ]);
    },
  });

  const updateLeverage = useMutation({
    mutationFn: async ({
      accountId: targetAccountId,
      leverage,
    }: {
      accountId: string;
      leverage: number;
    }) => {
      if (!organizationId || !targetAccountId) {
        throw new Error(
          "A trading account is required.",
        );
      }

      return updateTradingAccountLeverage(
        organizationId,
        targetAccountId,
        leverage,
      );
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "trading-account",
            organizationId,
            variables.accountId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: accountsKey,
        }),
      ]);
    },
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (!organizationId || !accountId) {
        throw new Error(
          "An active trading account is required.",
        );
      }

      return resetDemoTradingAccount(
        organizationId,
        accountId,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: accountKey,
        }),
        queryClient.invalidateQueries({
          queryKey: accountsKey,
        }),
      ]);
    },
  });

  return {
    addFunds,
    updateLeverage,
    reset,
  };
}
