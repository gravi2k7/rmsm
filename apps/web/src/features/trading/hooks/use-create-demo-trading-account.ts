"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDemoTradingAccount,
} from "../api/trading-api";

export function useCreateDemoTradingAccount(
  organizationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      currency: string;
      startingBalance: number;
      leverage?: number;
    }) => {
      if (!organizationId) {
        throw new Error(
          "An active organization is required.",
        );
      }

      return createDemoTradingAccount(
        organizationId,
        input,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "trading-accounts",
          organizationId,
        ],
      });
    },
  });
}
