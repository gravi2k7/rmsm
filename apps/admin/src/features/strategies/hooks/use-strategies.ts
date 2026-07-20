import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateStrategyInput, Paginated, Strategy, UpdateStrategyInput } from "../types";

const STRATEGIES_KEY = ["strategies"] as const;

export function useStrategies(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search) query.set("search", params.search);

  return useQuery({
    queryKey: [...STRATEGIES_KEY, params],
    queryFn: () => api.get<Paginated<Strategy>>(`/strategies?${query.toString()}`),
  });
}

export function useStrategy(id: string | undefined) {
  return useQuery({
    queryKey: [...STRATEGIES_KEY, id],
    queryFn: () => api.get<Strategy>(`/strategies/${id}`),
    enabled: !!id,
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStrategyInput) => api.post<Strategy>("/strategies", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY }),
  });
}

export function useUpdateStrategy(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStrategyInput) => api.put<Strategy>(`/strategies/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY }),
  });
}

/** "Delete" archives — no hard deletes anywhere on this platform (see
 * `DeleteStrategyDto`'s own doc comment in apps/api). */
export function useArchiveStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/strategies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY }),
  });
}
