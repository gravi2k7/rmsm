import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  placePaperOrder,
} from "../api/trading-api";
import type { PlacePaperOrderInput } from "../types";

export function usePaperOrder(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlacePaperOrderInput) => {
      if (!organizationId || !accountId) {
        throw new Error(
          "Trading organization and account are required",
        );
      }

      return placePaperOrder(
        organizationId,
        accountId,
        input,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "trading-accounts",
            organizationId,
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
    },
  });
}
