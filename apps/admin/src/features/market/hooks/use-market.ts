import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Exchange, MarketSymbol, Paginated } from "../types";

export function useExchanges() {
  return useQuery({
    queryKey: ["market", "exchanges"],
    queryFn: () => api.get<Paginated<Exchange>>("/markets?pageSize=100"),
  });
}

export function useSymbols() {
  return useQuery({
    queryKey: ["market", "symbols"],
    queryFn: () => api.get<Paginated<MarketSymbol>>("/symbols?pageSize=500"),
  });
}
