import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  cancelAllTradingOrders,
  cancelTradingOrder,
  closeTradingPosition,
  flattenAllTradingPositions,
  reverseTradingPosition,
  updatePendingTradingOrder,
} from "../api/trading-api";

function invalidateTradingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["trading-accounts", organizationId],
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
        "trading-ledger",
        organizationId,
        accountId,
      ],
    }),
    queryClient.invalidateQueries({
      queryKey: [
        "trading-positions",
        organizationId,
        accountId,
      ],
    }),
    queryClient.invalidateQueries({
      queryKey: [
        "trading-orders",
        organizationId,
        accountId,
      ],
    }),
    queryClient.invalidateQueries({
      queryKey: [
        "trading-trades",
        organizationId,
        accountId,
      ],
    }),
  ]);
}

export function useTradingActions(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  const queryClient = useQueryClient();

  const requireContext = () => {
    if (!organizationId || !accountId) {
      throw new Error(
        "Trading organization and account are required",
      );
    }

    return {
      organizationId,
      accountId,
    };
  };

  const closePosition = useMutation({
    mutationFn: (positionId: string) => {
      const context = requireContext();

      return closeTradingPosition(
        context.organizationId,
        context.accountId,
        positionId,
      );
    },
    onSuccess: () =>
      invalidateTradingQueries(
        queryClient,
        organizationId,
        accountId,
      ),
  });

  const reversePosition = useMutation({
    mutationFn: (positionId: string) => {
      const context = requireContext();

      return reverseTradingPosition(
        context.organizationId,
        context.accountId,
        positionId,
      );
    },
    onSuccess: () =>
      invalidateTradingQueries(
        queryClient,
        organizationId,
        accountId,
      ),
  });

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) => {
      const context = requireContext();

      return cancelTradingOrder(
        context.organizationId,
        context.accountId,
        orderId,
      );
    },
    onSuccess: () =>
      invalidateTradingQueries(
        queryClient,
        organizationId,
        accountId,
      ),
  });
  const updatePendingOrder = useMutation({
    mutationFn: ({
      orderId,
      price,
    }: {
      orderId: string;
      price: string;
    }) => {
      const context = requireContext();

      return updatePendingTradingOrder(
        context.organizationId,
        context.accountId,
        orderId,
        price,
      );
    },
    onSuccess: () =>
      invalidateTradingQueries(
        queryClient,
        organizationId,
        accountId,
      ),
  });


  const cancelAllOrders = useMutation({
    mutationFn: () => {
      const context = requireContext();

      return cancelAllTradingOrders(
        context.organizationId,
        context.accountId,
      );
    },
    onSuccess: () =>
      invalidateTradingQueries(
        queryClient,
        organizationId,
        accountId,
      ),
  });

  const flattenAllPositions = useMutation({
    mutationFn: () => {
      const context = requireContext();

      return flattenAllTradingPositions(
        context.organizationId,
        context.accountId,
      );
    },
    onSuccess: () =>
      invalidateTradingQueries(
        queryClient,
        organizationId,
        accountId,
      ),
  });

  return {
    closePosition,
    reversePosition,
    cancelOrder,
    updatePendingOrder,
    cancelAllOrders,
    flattenAllPositions,
    isPending:
      closePosition.isPending ||
      reversePosition.isPending ||
      updatePendingOrder.isPending ||
      cancelOrder.isPending ||
      cancelAllOrders.isPending ||
      flattenAllPositions.isPending,
  };
}
