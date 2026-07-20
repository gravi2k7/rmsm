"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api";
import { useRequestContext } from "@/hooks/use-request-context";
import type { NotificationStatus } from "../types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status?: NotificationStatus) => [...notificationKeys.all, "list", status ?? "ALL"] as const,
};

export function useNotifications(status?: NotificationStatus) {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: notificationKeys.list(status),
    queryFn: () => notificationApi.list(ctx!, { status, take: 500 }),
    enabled: !!ctx,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(ctx!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useArchiveNotification() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.archive(ctx!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useDeleteNotification() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.remove(ctx!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

/** There's no bulk "mark all read" endpoint — this issues one real
 * request per notification rather than fabricating a single-call bulk
 * action the API doesn't offer. */
export function useMarkAllRead() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => notificationApi.markRead(ctx!, id)));
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
