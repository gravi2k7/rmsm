"use client";

import { Mail, RotateCw, X, AlertCircle } from "lucide-react";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton, Alert, AlertDescription } from "@rmsm/ui";
import { usePendingInvitations, useCancelInvitation, useResendInvitation } from "../hooks/use-invitations";
import type { InvitationStatus } from "../types";
import { ApiError } from "@/lib/api-client";

const STATUS_VARIANT: Record<InvitationStatus, "secondary" | "success" | "destructive" | "warning" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "success",
  REJECTED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "warning",
};

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

/** Pending Invitations (WM-020E). Lists every invitation ever sent for the
 * organization (the backend's own list endpoint returns PENDING ones, but
 * an invitation that's expired client-side-relative-to-`expiresAt` still
 * shows here with an "Expired" badge until the backend's sweep or an
 * explicit expire/resend call updates its status) with Resend/Cancel
 * actions, gated the same way the Invite dialog is. */
export function PendingInvitationsList() {
  const invitationsQuery = usePendingInvitations();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();

  if (invitationsQuery.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (invitationsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          {invitationsQuery.error instanceof ApiError ? invitationsQuery.error.message : "Couldn't load pending invitations."}
        </AlertDescription>
      </Alert>
    );
  }

  const invitations = invitationsQuery.data ?? [];

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        <Mail className="h-6 w-6" aria-hidden="true" />
        No pending invitations.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(cancelInvitation.isError || resendInvitation.isError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            {(cancelInvitation.error instanceof ApiError && cancelInvitation.error.message) ||
              (resendInvitation.error instanceof ApiError && resendInvitation.error.message) ||
              "That action failed."}
          </AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const expired = invitation.status === "PENDING" && isExpired(invitation.expiresAt);
            const displayStatus: InvitationStatus = expired ? "EXPIRED" : invitation.status;
            return (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell>{invitation.role}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[displayStatus]}>{displayStatus === "REJECTED" ? "DECLINED" : displayStatus}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {(invitation.status === "PENDING" || invitation.status === "EXPIRED") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendInvitation.mutate(invitation.id)}
                      disabled={resendInvitation.isPending}
                      aria-label={`Resend invitation to ${invitation.email}`}
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                  {invitation.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvitation.mutate(invitation.id)}
                      disabled={cancelInvitation.isPending}
                      aria-label={`Cancel invitation to ${invitation.email}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
