import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Decision, Paginated } from "../types";

const DECISIONS_KEY = ["decisions"] as const;

export function useDecisions() {
  return useQuery({
    queryKey: DECISIONS_KEY,
    queryFn: () => api.get<Paginated<Decision>>("/decisions?pageSize=500"),
    refetchInterval: 15_000,
  });
}

export function useApproveDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => api.put<Decision>(`/decisions/${id}/approve`, { comments }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DECISIONS_KEY }),
  });
}

export function useRejectDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => api.put<Decision>(`/decisions/${id}/reject`, { comments }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DECISIONS_KEY }),
  });
}
