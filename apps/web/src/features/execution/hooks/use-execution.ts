import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Execution, Order, Paginated } from "../types";

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
