"use client";

import { Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@rmsm/ui";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";
import { PendingInvitationsList } from "@/features/organizations/components/pending-invitations-list";
import { useAuthStore } from "@/lib/auth-store";
import { useRequestContext } from "@/hooks/use-request-context";

/** Team settings page (WM-020E) — Invite Member + Pending Invitations,
 * the two "UI" requirements that need a persistent home rather than a
 * one-time flow (unlike Accept/Decline/Expired/Success, which are
 * reached from an emailed link, not site navigation). */
export default function TeamPage() {
  const canInvite = useAuthStore((s) => s.hasPermission("organization.member.invite"));
  const ctx = useRequestContext();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">Invite teammates and manage pending invitations.</p>
        </div>
        {canInvite && <InviteMemberDialog />}
      </div>

      {!ctx ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" aria-hidden="true" />
              No active organization session
            </CardTitle>
            <CardDescription>Sign in to view and manage this organization&apos;s team.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
            <CardDescription>Invitations that haven&apos;t been accepted or declined yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitationsList />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
