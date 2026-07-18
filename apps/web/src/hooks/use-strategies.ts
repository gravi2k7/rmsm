"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { strategyApi } from "@/lib/api-client";
import { useRequestContext } from "./use-request-context";
import type { ListStrategiesParams, StrategyCategory } from "@/types/strategy";

export const strategyKeys = {
  all: ["strategies"] as const,
  lists: () => [...strategyKeys.all, "list"] as const,
  list: (params: ListStrategiesParams) => [...strategyKeys.lists(), params] as const,
  details: () => [...strategyKeys.all, "detail"] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
  categories: () => [...strategyKeys.all, "categories"] as const,
  tags: () => [...strategyKeys.all, "tags"] as const,
};

export function useStrategies(params: ListStrategiesParams) {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: strategyKeys.list(params),
    queryFn: () => strategyApi.list(ctx!, params),
    enabled: !!ctx,
    placeholderData: (prev) => prev,
  });
}

export function useStrategy(strategyId: string | undefined) {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: strategyKeys.detail(strategyId ?? ""),
    queryFn: () => strategyApi.get(ctx!, strategyId!),
    enabled: !!ctx && !!strategyId,
  });
}

export function useStrategyCategories() {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: strategyKeys.categories(),
    queryFn: () => strategyApi.categories(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useStrategyTags() {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: strategyKeys.tags(),
    queryFn: () => strategyApi.tags(ctx!),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useCreateStrategy() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description: string; category: StrategyCategory }) => strategyApi.create(ctx!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
    },
  });
}

export function useUpdateStrategy(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; description?: string; addTags?: string[]; removeTags?: string[] }) =>
      strategyApi.update(ctx!, strategyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(strategyKeys.detail(strategyId), data);
      void queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
    },
  });
}

export function useArchiveStrategy() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (strategyId: string) => strategyApi.archive(ctx!, strategyId),
    onSuccess: (data) => {
      queryClient.setQueryData(strategyKeys.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
    },
  });
}

export function useCloneStrategy() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ strategyId, newName }: { strategyId: string; newName: string }) => strategyApi.clone(ctx!, strategyId, newName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
    },
  });
}

export function usePublishLatestApproved(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => strategyApi.publishLatestApproved(ctx!, strategyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategyId) });
      void queryClient.invalidateQueries({ queryKey: ["strategy-versions", strategyId] });
    },
  });
}
