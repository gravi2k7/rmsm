import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Paginated, Portfolio, Position, Trade } from "../types";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api.get<Portfolio>("/portfolio"),
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: () => api.get<Paginated<Position>>("/positions?pageSize=500"),
  });
}

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: () => api.get<Paginated<Trade>>("/trades?pageSize=500"),
  });
}
