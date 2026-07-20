"use client";

import { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/data-states";
import { useOrganizations, useMembers } from "@/features/organizations/hooks/use-organizations";
import { MembersTable } from "@/features/organizations/components/members-table";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";

/**
 * "Users" here means organization members — the platform has no
 * cross-organization user directory endpoint (only `users/me` for the
 * caller's own account, and organization-scoped member management).
 * Creating a user happens by inviting them into an organization; there
 * is no standalone "create a user account directly" admin action in the
 * existing API, and this page doesn't invent one. Reset Password and
 * direct per-user permission assignment (as opposed to role assignment)
 * also have no corresponding endpoint and are intentionally not offered
 * here, rather than a dead button.
 */
export default function UsersPage() {
  const organizations = useOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const members = useMembers(selectedOrgId);

  useEffect(() => {
    if (!selectedOrgId && organizations.data?.items.length) {
      setSelectedOrgId(organizations.data.items[0]!.id);
    }
  }, [organizations.data, selectedOrgId]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage members within an organization."
        actions={selectedOrgId ? <InviteMemberDialog organizationId={selectedOrgId} /> : undefined}
      />

      {organizations.isLoading ? (
        <LoadingState />
      ) : organizations.error ? (
        <ErrorState error={organizations.error} onRetry={() => organizations.refetch()} />
      ) : !organizations.data || organizations.data.items.length === 0 ? (
        <EmptyState title="No organizations yet" description="Create an organization first to manage its members." />
      ) : (
        <>
          <div className="mb-4 max-w-xs">
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger aria-label="Select organization">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.data.items.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrgId && (
            <MembersTable organizationId={selectedOrgId} members={members.data} isLoading={members.isLoading} error={members.error} onRetry={() => members.refetch()} />
          )}
        </>
      )}
    </div>
  );
}
