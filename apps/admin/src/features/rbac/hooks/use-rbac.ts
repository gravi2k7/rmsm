import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Permission, Role, RoleWithPermissions } from "../types";

const ROLES_KEY = ["roles"] as const;
const PERMISSIONS_KEY = ["permissions"] as const;

export function useRoles() {
  return useQuery({ queryKey: ROLES_KEY, queryFn: () => api.get<RoleWithPermissions[]>("/roles") });
}

export function usePermissions() {
  return useQuery({ queryKey: PERMISSIONS_KEY, queryFn: () => api.get<Permission[]>("/permissions") });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => api.post<Role>("/roles", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useGrantPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roleId: string; permissionId: string }) => api.post("/roles/permissions/grant", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useRevokePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) => api.delete(`/roles/${roleId}/permissions/${permissionId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}
