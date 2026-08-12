import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import type {
  CreateStrategyInput,
  PaginatedStrategies,
  Strategy,
  UpdateStrategyInput,
} from "../types";

const STRATEGIES_KEY = ["strategies"] as const;

export function useStrategies(
  params: {
    page?: number;
    pageSize?: number;
    status?: string;
    category?: string;
    tag?: string;
    searchText?: string;
  } = {},
) {
  const { organizationId } = useOrganizationContext();

  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  if (params.tag) query.set("tag", params.tag);
  if (params.searchText) query.set("searchText", params.searchText);

  return useQuery({
    queryKey: [...STRATEGIES_KEY, organizationId, params],
    queryFn: () =>
      api.get<PaginatedStrategies>(
        `/organizations/${organizationId}/strategies?${query.toString()}`,
      ),
    enabled: !!organizationId,
  });
}

export function useStrategy(id: string | undefined) {
  const { organizationId } = useOrganizationContext();

  return useQuery({
    queryKey: [...STRATEGIES_KEY, organizationId, id],
    queryFn: () =>
      api.get<Strategy>(
        `/organizations/${organizationId}/strategies/${id}`,
      ),
    enabled: !!organizationId && !!id,
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: (input: CreateStrategyInput) => {
      if (!organizationId) {
        throw new Error("No organization is selected.");
      }

      return api.post<Strategy>(
        `/organizations/${organizationId}/strategies`,
        input,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...STRATEGIES_KEY, organizationId],
      }),
  });
}

export function useUpdateStrategy(id: string) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: (input: UpdateStrategyInput) => {
      if (!organizationId) {
        throw new Error("No organization is selected.");
      }

      return api.put<Strategy>(
        `/organizations/${organizationId}/strategies/${id}`,
        input,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...STRATEGIES_KEY, organizationId],
      }),
  });
}

export function useArchiveStrategy() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: (id: string) => {
      if (!organizationId) {
        throw new Error("No organization is selected.");
      }

      return api.delete<Strategy>(
        `/organizations/${organizationId}/strategies/${id}`,
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...STRATEGIES_KEY, organizationId],
      }),
  });
}
