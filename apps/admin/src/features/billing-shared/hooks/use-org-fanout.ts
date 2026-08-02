"use client";

import { useQueries } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import type { Organization } from "@/features/organizations/types";
import type { FanOutResult } from "../types";

/**
 * Fetches one org-scoped billing endpoint per organization in parallel
 * (`useQueries`, not a loop of `useQuery`, so the count of hooks called
 * doesn't change across renders as the org list loads). A 403 from
 * `OrganizationRoleGuard` — expected for orgs the admin isn't a member
 * of, see `types.ts` — is treated as `restricted: true`, a distinct,
 * displayable state, not folded into a generic error.
 */
export function useOrgFanout<T>(
  organizations: Organization[] | undefined,
  pathFor: (organizationId: string) => string,
  queryKeyPrefix: string,
): FanOutResult<T>[] {
  const results = useQueries({
    queries: (organizations ?? []).map((org) => ({
      queryKey: [queryKeyPrefix, org.id],
      queryFn: () => api.get<T>(pathFor(org.id)),
      retry: false,
      staleTime: 30_000,
    })),
  });

  return (organizations ?? []).map((organization, i) => {
    const result = results[i];
    const restricted = result?.error instanceof ApiError && (result.error.statusCode === 403 || result.error.statusCode === 404);
    return {
      organization,
      data: result?.data as T | undefined,
      restricted,
      isLoading: result?.isLoading ?? false,
      error: restricted ? undefined : result?.error,
    };
  });
}
