import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaginationMeta } from "@/types/strategy";
import type { Profile, UpdateProfileInput, UserAccountSummary } from "../types";

export function useUserAccount() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.get<UserAccountSummary>("/users/me"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<Profile>("/users/me/profile", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}

export interface LoginHistoryEntry {
  id: string;
  email: string;
  success: boolean;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface LoginHistoryPage {
  data: LoginHistoryEntry[];
  pagination: PaginationMeta;
}

export function useLoginHistory(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["sessions", "login-history", page, pageSize],
    queryFn: () => api.get<LoginHistoryPage>(`/sessions/login-history?page=${page}&pageSize=${pageSize}`),
  });
}
