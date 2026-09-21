"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addTradingFunds,
  resetDemoTradingAccount,
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
    reset,
  };
}
