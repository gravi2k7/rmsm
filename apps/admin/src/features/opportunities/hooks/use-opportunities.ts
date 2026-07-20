import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Opportunity, Paginated } from "../types";

/** `GET /opportunities` returns every status merged (no server-side
 * status filter — see `ListOpportunitiesHandler`'s own doc comment in
 * apps/api on why: the domain repository interface has no `findAll()`).
 * A live-monitoring "refetch every 15s" polling interval, since
 * opportunities are inherently time-sensitive (they expire) — a stale
 * 30s-cached view here would show opportunities as still pending after
 * they've already expired. */
export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api.get<Paginated<Opportunity>>("/opportunities?pageSize=500"),
    refetchInterval: 15_000,
  });
}
