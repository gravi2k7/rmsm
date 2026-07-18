"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { strategyApi, versionApi } from "@/lib/api-client";
import { useRequestContext } from "./use-request-context";
import { strategyKeys } from "./use-strategies";
import type { RuleGroupNode, StrategyParameterDefinition } from "@/types/strategy";

export const versionKeys = {
  all: ["strategy-versions"] as const,
  listFor: (strategyId: string) => [...versionKeys.all, "list", strategyId] as const,
  detail: (versionId: string) => [...versionKeys.all, "detail", versionId] as const,
};

export function useStrategyVersions(strategyId: string | undefined) {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: versionKeys.listFor(strategyId ?? ""),
    queryFn: () => strategyApi.listVersions(ctx!, strategyId!),
    enabled: !!ctx && !!strategyId,
  });
}

export function useStrategyVersion(versionId: string | undefined) {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: versionKeys.detail(versionId ?? ""),
    queryFn: () => versionApi.get(ctx!, versionId!),
    enabled: !!ctx && !!versionId,
  });
}

export function useCreateVersion(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { entryRules: RuleGroupNode; exitRules: RuleGroupNode; parameters: StrategyParameterDefinition[] }) =>
      strategyApi.createVersion(ctx!, strategyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: versionKeys.listFor(strategyId) });
      void queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategyId) });
    },
  });
}

export function useValidateVersion(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionApi.validate(ctx!, versionId),
    onSuccess: (_data, versionId) => {
      void queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      void queryClient.invalidateQueries({ queryKey: versionKeys.listFor(strategyId) });
    },
  });
}

export function useRequestApproval(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionApi.requestApproval(ctx!, versionId),
    onSuccess: (_data, versionId) => {
      void queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      void queryClient.invalidateQueries({ queryKey: versionKeys.listFor(strategyId) });
    },
  });
}

export function useDecideApproval(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, decision, comments }: { versionId: string; decision: "APPROVED" | "REJECTED"; comments?: string }) =>
      versionApi.decide(ctx!, versionId, decision, comments),
    onSuccess: (_data, { versionId }) => {
      void queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      void queryClient.invalidateQueries({ queryKey: versionKeys.listFor(strategyId) });
    },
  });
}

export function usePublishVersion(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionApi.publish(ctx!, versionId),
    onSuccess: (_data, versionId) => {
      void queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      void queryClient.invalidateQueries({ queryKey: versionKeys.listFor(strategyId) });
      void queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategyId) });
    },
  });
}

export function useRollbackVersion(strategyId: string) {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionApi.rollback(ctx!, versionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: versionKeys.listFor(strategyId) });
    },
  });
}
