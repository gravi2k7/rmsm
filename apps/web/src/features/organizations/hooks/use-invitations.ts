"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitationApi, type InviteMemberInput } from "../api";
import { useRequestContext } from "@/hooks/use-request-context";

export const invitationKeys = {
  all: ["invitations"] as const,
  list: () => [...invitationKeys.all, "list"] as const,
};

/** Pending Invitations — org-scoped, requires an active session (see
 * useRequestContext()); `enabled: !!ctx` matches every other
 * org-scoped hook in this codebase (e.g. useNotifications()). */
export function usePendingInvitations() {
  const ctx = useRequestContext();
  return useQuery({
    queryKey: invitationKeys.list(),
    queryFn: () => invitationApi.list(ctx!),
    enabled: !!ctx,
  });
}

export function useInviteMember() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => invitationApi.invite(ctx!, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

export function useCancelInvitation() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationApi.cancel(ctx!, invitationId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

/** Powers the "Expired Invitation → allow resend" requirement — resend is
 * admin-initiated (Owner/Admin re-sending from the Pending Invitations
 * list), not self-service by the invitee, matching the backend's
 * `resendInvitation()` permission guard (organization.member.invite). */
export function useResendInvitation() {
  const ctx = useRequestContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationApi.resend(ctx!, invitationId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

/** Public, read-only preview of an invitation token — powers the
 * `/invitations/accept` page's initial "is this link still good, and
 * what is it for" check before the invitee does anything. */
export function useValidateInvitation(token: string | null) {
  return useQuery({
    queryKey: ["invitation-validate", token],
    queryFn: () => invitationApi.validate(token!),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) => invitationApi.accept(token),
  });
}

export function useDeclineInvitation() {
  return useMutation({
    mutationFn: (token: string) => invitationApi.decline(token),
  });
}
