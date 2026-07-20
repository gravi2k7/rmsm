import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Opportunity, Paginated } from "../types";

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api.get<Paginated<Opportunity>>("/opportunities?pageSize=500"),
    refetchInterval: 30_000,
  });
}
