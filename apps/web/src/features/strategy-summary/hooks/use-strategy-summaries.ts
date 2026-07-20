import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Paginated, StrategySummary } from "../types";

export function useStrategySummaries() {
  return useQuery({
    queryKey: ["strategy-summaries"],
    queryFn: () => api.get<Paginated<StrategySummary>>("/strategies?pageSize=500"),
  });
}
