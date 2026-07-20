import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Decision, Paginated } from "../types";

export function useDecisions() {
  return useQuery({
    queryKey: ["decisions"],
    queryFn: () => api.get<Paginated<Decision>>("/decisions?pageSize=500"),
    refetchInterval: 30_000,
  });
}
