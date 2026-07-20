import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateOrganizationInput, InviteMemberInput, Member, Organization, Paginated, UpdateOrganizationInput } from "../types";

const ORGANIZATIONS_KEY = ["organizations"] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: () => api.get<Paginated<Organization>>("/organizations?page=1&pageSize=100"),
  });
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: [...ORGANIZATIONS_KEY, id],
    queryFn: () => api.get<Organization>(`/organizations/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => api.post<Organization>("/organizations", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY }),
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => api.patch<Organization>(`/organizations/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY }),
  });
}

export function useArchiveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Organization>(`/organizations/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY }),
  });
}

export function useRestoreOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Organization>(`/organizations/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY }),
  });
}

export function useMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["organizations", organizationId, "members"],
    queryFn: () => api.get<Member[]>(`/organizations/${organizationId}/members`),
    enabled: !!organizationId,
  });
}

function useMembersMutation<TInput>(organizationId: string, fn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations", organizationId, "members"] }),
  });
}

export function useInviteMember(organizationId: string) {
  return useMembersMutation<InviteMemberInput>(organizationId, (input) => api.post(`/organizations/${organizationId}/members/invite`, input));
}

export function useUpdateMemberRole(organizationId: string) {
  return useMembersMutation<{ membershipId: string; role: string }>(organizationId, ({ membershipId, role }) =>
    api.patch(`/organizations/${organizationId}/members/${membershipId}/role`, { role }),
  );
}

export function useSuspendMember(organizationId: string) {
  return useMembersMutation<string>(organizationId, (membershipId) => api.post(`/organizations/${organizationId}/members/${membershipId}/suspend`));
}

export function useReactivateMember(organizationId: string) {
  return useMembersMutation<string>(organizationId, (membershipId) => api.post(`/organizations/${organizationId}/members/${membershipId}/reactivate`));
}

export function useRemoveMember(organizationId: string) {
  return useMembersMutation<string>(organizationId, (membershipId) => api.delete(`/organizations/${organizationId}/members/${membershipId}`));
}
