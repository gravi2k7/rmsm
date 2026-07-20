import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { DeadLetterJob, NotificationMetrics, RedactedProvider } from "../types";

export function useNotificationMetrics() {
  return useQuery({
    queryKey: ["notifications", "metrics"],
    queryFn: () => api.get<NotificationMetrics>("/notifications/admin/metrics"),
    refetchInterval: 15_000,
  });
}

export function useEmailProviders() {
  return useQuery({ queryKey: ["notifications", "providers", "email"], queryFn: () => api.get<RedactedProvider[]>("/notifications/admin/providers/email") });
}

export function useSmsProviders() {
  return useQuery({ queryKey: ["notifications", "providers", "sms"], queryFn: () => api.get<RedactedProvider[]>("/notifications/admin/providers/sms") });
}

export function usePushProviders() {
  return useQuery({ queryKey: ["notifications", "providers", "push"], queryFn: () => api.get<RedactedProvider[]>("/notifications/admin/providers/push") });
}

export function useDeadLetterQueue(queueName: string) {
  return useQuery({
    queryKey: ["notifications", "dead-letter", queueName],
    queryFn: () => api.get<DeadLetterJob[]>(`/notifications/admin/dead-letter/${queueName}`),
    enabled: !!queueName,
  });
}

export function useRetryDeadLetter(queueName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ retried: number }>(`/notifications/admin/dead-letter/${queueName}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "dead-letter", queueName] }),
  });
}
