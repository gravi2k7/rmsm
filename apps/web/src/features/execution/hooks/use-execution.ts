import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateOrderInput, Execution, Order, Paginated } from "../types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Paginated<Order>>("/orders?pageSize=500"),
    refetchInterval: 15_000,
  });
}

export function useExecutions() {
  return useQuery({
    queryKey: ["executions"],
    queryFn: () => api.get<Paginated<Execution>>("/executions?pageSize=500"),
    refetchInterval: 15_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => api.post<Order>("/orders", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });
}
