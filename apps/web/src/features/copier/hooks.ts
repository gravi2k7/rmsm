"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addCopyGroupMember,
  createCopyGroup,
  getCopyGroup,
  getCopyGroups,
  updateCopyGroup,
  updateCopyGroupMember,
  updateCopyRule,
  type AddCopyGroupMemberInput,
  type CopyGroupStatus,
  type CreateCopyGroupInput,
} from "./api";

const copyGroupKeys = {
  all: (organizationId: string) =>
    ["copy-groups", organizationId] as const,
  detail: (organizationId: string, groupId: string) =>
    ["copy-groups", organizationId, groupId] as const,
};

export function useCopyGroups(
  organizationId: string | undefined,
) {
  return useQuery({
    queryKey: organizationId
      ? copyGroupKeys.all(organizationId)
      : ["copy-groups", "disabled"],
    queryFn: () => getCopyGroups(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useCopyGroup(
  organizationId: string | undefined,
  groupId: string | undefined,
) {
  return useQuery({
    queryKey:
      organizationId && groupId
        ? copyGroupKeys.detail(organizationId, groupId)
        : ["copy-group", "disabled"],
    queryFn: () => getCopyGroup(organizationId!, groupId!),
    enabled: Boolean(organizationId && groupId),
  });
}

export function useCreateCopyGroup(
  organizationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCopyGroupInput) =>
      createCopyGroup(organizationId!, input),
    onSuccess: () => {
      if (organizationId) {
        void queryClient.invalidateQueries({
          queryKey: copyGroupKeys.all(organizationId),
        });
      }
    },
  });
}

export function useUpdateCopyGroup(
  organizationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      status,
      name,
    }: {
      groupId: string;
      status?: CopyGroupStatus;
      name?: string;
    }) =>
      updateCopyGroup(organizationId!, groupId, {
        status,
        name,
      }),
    onSuccess: (group) => {
      if (!organizationId) return;

      void queryClient.invalidateQueries({
        queryKey: copyGroupKeys.all(organizationId),
      });

      void queryClient.setQueryData(
        copyGroupKeys.detail(organizationId, group.id),
        group,
      );
    },
  });
}

export function useAddCopyGroupMember(
  organizationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      input,
    }: {
      groupId: string;
      input: AddCopyGroupMemberInput;
    }) =>
      addCopyGroupMember(
        organizationId!,
        groupId,
        input,
      ),
    onSuccess: (_, variables) => {
      if (!organizationId) return;

      void queryClient.invalidateQueries({
        queryKey: copyGroupKeys.all(organizationId),
      });

      void queryClient.invalidateQueries({
        queryKey: copyGroupKeys.detail(
          organizationId,
          variables.groupId,
        ),
      });
    },
  });
}

export function useUpdateCopyGroupMember(
  organizationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      memberId,
      input,
    }: {
      groupId: string;
      memberId: string;
      input: {
        quantityMultiplier?: string;
        fixedQuantity?: string | null;
        maxQuantity?: string | null;
        enabled?: boolean;
      };
    }) =>
      updateCopyGroupMember(
        organizationId!,
        groupId,
        memberId,
        input,
      ),
    onSuccess: (_, variables) => {
      if (!organizationId) return;

      void queryClient.invalidateQueries({
        queryKey: copyGroupKeys.detail(
          organizationId,
          variables.groupId,
        ),
      });
    },
  });
}

export function useUpdateCopyRule(
  organizationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      memberId,
      input,
    }: {
      groupId: string;
      memberId: string;
      input: Parameters<typeof updateCopyRule>[3];
    }) =>
      updateCopyRule(
        organizationId!,
        groupId,
        memberId,
        input,
      ),
    onSuccess: (_, variables) => {
      if (!organizationId) return;

      void queryClient.invalidateQueries({
        queryKey: copyGroupKeys.detail(
          organizationId,
          variables.groupId,
        ),
      });
    },
  });
}
