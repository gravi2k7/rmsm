"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  updateTradingPositionRisk,
  type UpdateTradingPositionRiskInput,
} from "../api/trading-api";

export function useUpdateTradingPositionRisk(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      positionId: string;
      stopLossPrice?: string | null;
      takeProfitPrice?: string | null;
    }) => {
      if (!organizationId || !accountId) {
        throw new Error(
          "Trading organization and account are required",
        );
      }

      const risk: UpdateTradingPositionRiskInput = {
        stopLossPrice: input.stopLossPrice,
        takeProfitPrice: input.takeProfitPrice,
      };

      return updateTradingPositionRisk(
        organizationId,
        accountId,
        input.positionId,
        risk,
      );
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "trading-positions",
            organizationId,
            accountId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "trading-account",
            organizationId,
            accountId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "trading-accounts",
            organizationId,
          ],
        }),
      ]);
    },
  });
}
