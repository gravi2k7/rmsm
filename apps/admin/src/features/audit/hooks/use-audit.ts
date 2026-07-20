import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { LoginHistoryEntry, PaginatedResult, Session } from "../types";

export function useLoginHistory() {
  return useQuery({
    queryKey: ["audit", "login-history"],
    queryFn: () => api.get<PaginatedResult<LoginHistoryEntry>>("/sessions/login-history?pageSize=100"),
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ["audit", "sessions"],
    queryFn: () => api.get<Session[]>("/sessions"),
  });
}
